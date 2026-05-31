<?php

namespace App\Core\Services;

use App\Core\Models\Workspace;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IntegrationWebhookReplayService
{
    public function replayByEventId(string $eventId): array
    {
        $event = DB::table('integration_webhook_events')->where('id', $eventId)->first();
        if (! $event) {
            return ['processed' => false, 'reason' => 'event_not_found'];
        }

        $payload = $this->decodeJson($event->payload);
        $processor = (string) $event->processor;

        return match ($processor) {
            'stripe' => $this->replayStripe($event, $payload),
            'payfast' => $this->replayPayfast($event, $payload),
            default => ['processed' => false, 'reason' => 'unsupported_processor'],
        };
    }

    private function replayStripe(object $event, array $payload): array
    {
        $type = (string) ($payload['type'] ?? $event->event_type);
        $object = (array) ($payload['data']['object'] ?? []);

        return match ($type) {
            'customer.subscription.created',
            'customer.subscription.updated' => $this->applyStripeSubscriptionUpsert($object),
            'customer.subscription.deleted' => $this->applyStripeSubscriptionDeleted($object),
            'invoice.payment_succeeded' => $this->applyStripeInvoicePaid($object),
            'invoice.payment_failed' => $this->applyStripeInvoiceFailed($object),
            default => ['processed' => false, 'reason' => 'unsupported_event_type', 'event_type' => $type],
        };
    }

    private function replayPayfast(object $event, array $payload): array
    {
        $workspaceId = $payload['custom_str1'] ?? $event->workspace_id;
        $status = (string) ($payload['payment_status'] ?? '');
        if ($status !== 'COMPLETE') {
            return ['processed' => true, 'reason' => 'non_complete_notification'];
        }

        $workspace = Workspace::find($workspaceId);
        if (! $workspace) {
            return ['processed' => false, 'reason' => 'workspace_not_found'];
        }

        $plan = (string) ($payload['custom_str2'] ?? $workspace->plan ?? 'starter');
        $token = $payload['token'] ?? null;

        DB::transaction(function () use ($workspace, $plan, $token, $payload) {
            $workspace->update([
                'plan' => $plan,
                'payfast_subscription_token' => $token ?? $workspace->payfast_subscription_token,
                'plan_expires_at' => now()->addMonth(),
            ]);

            $this->upsertBillingEvent(
                workspaceId: (string) $workspace->id,
                processor: 'payfast',
                processorEventId: (string) ($payload['pf_payment_id'] ?? Str::uuid()),
                eventType: 'payment_succeeded',
                payload: $payload,
            );
        });

        return ['processed' => true];
    }

    private function applyStripeSubscriptionUpsert(array $sub): array
    {
        $workspaceId = $sub['metadata']['workspace_id'] ?? null;
        if (! $workspaceId) {
            return ['processed' => false, 'reason' => 'workspace_missing'];
        }

        $workspace = Workspace::find($workspaceId);
        if (! $workspace) {
            return ['processed' => false, 'reason' => 'workspace_not_found'];
        }

        $priceId = (string) ($sub['items']['data'][0]['price']['id'] ?? '');
        $plan = $this->stripePriceToPlan($priceId);
        $periodEnd = (int) ($sub['current_period_end'] ?? now()->addMonth()->timestamp);

        DB::transaction(function () use ($workspace, $sub, $plan, $periodEnd) {
            $workspace->update([
                'stripe_subscription_id' => $sub['id'] ?? $workspace->stripe_subscription_id,
                'plan' => $plan,
                'plan_expires_at' => Carbon::createFromTimestamp($periodEnd),
            ]);

            $this->upsertBillingEvent(
                workspaceId: (string) $workspace->id,
                processor: 'stripe',
                processorEventId: (string) ($sub['id'] ?? Str::uuid()),
                eventType: 'subscription_upsert',
                payload: $sub,
            );
        });

        return ['processed' => true];
    }

    private function applyStripeSubscriptionDeleted(array $sub): array
    {
        $workspaceId = $sub['metadata']['workspace_id'] ?? null;
        if (! $workspaceId) {
            return ['processed' => false, 'reason' => 'workspace_missing'];
        }

        Workspace::where('id', $workspaceId)->update([
            'plan' => 'free',
            'stripe_subscription_id' => null,
            'plan_expires_at' => null,
        ]);

        return ['processed' => true];
    }

    private function applyStripeInvoicePaid(array $invoice): array
    {
        $customerId = $invoice['customer'] ?? null;
        if (! $customerId) {
            return ['processed' => false, 'reason' => 'customer_missing'];
        }

        $workspace = Workspace::where('stripe_customer_id', $customerId)->first();
        if (! $workspace) {
            return ['processed' => false, 'reason' => 'workspace_not_found'];
        }

        $this->upsertBillingEvent(
            workspaceId: (string) $workspace->id,
            processor: 'stripe',
            processorEventId: (string) ($invoice['id'] ?? Str::uuid()),
            eventType: 'invoice_paid',
            payload: [
                'invoice_id' => $invoice['id'] ?? null,
                'amount' => $invoice['amount_paid'] ?? null,
            ],
        );

        return ['processed' => true];
    }

    private function applyStripeInvoiceFailed(array $invoice): array
    {
        $customerId = $invoice['customer'] ?? null;
        if (! $customerId) {
            return ['processed' => false, 'reason' => 'customer_missing'];
        }

        $workspace = Workspace::where('stripe_customer_id', $customerId)->first();
        if (! $workspace) {
            return ['processed' => false, 'reason' => 'workspace_not_found'];
        }

        $expiresAt = (int) ($invoice['period_end'] ?? $invoice['created'] ?? now()->timestamp);
        $workspace->update([
            'plan_status' => 'past_due',
            'plan_expires_at' => Carbon::createFromTimestamp($expiresAt),
        ]);

        $this->upsertBillingEvent(
            workspaceId: (string) $workspace->id,
            processor: 'stripe',
            processorEventId: (string) ($invoice['id'] ?? Str::uuid()),
            eventType: 'invoice_payment_failed',
            payload: [
                'invoice_id' => $invoice['id'] ?? null,
                'amount' => $invoice['amount_due'] ?? null,
            ],
        );

        return ['processed' => true];
    }

    private function upsertBillingEvent(
        string $workspaceId,
        string $processor,
        string $processorEventId,
        string $eventType,
        array $payload
    ): void {
        DB::table('billing_events')->updateOrInsert(
            ['processor' => $processor, 'processor_event_id' => $processorEventId],
            [
                'id' => (string) Str::uuid(),
                'workspace_id' => $workspaceId,
                'event_type' => $eventType,
                'payload' => json_encode($payload),
                'processed_at' => now(),
            ]
        );
    }

    private function decodeJson(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    private function stripePriceToPlan(string $priceId): string
    {
        return match ($priceId) {
            (string) config('services.stripe.prices.growth') => 'growth',
            (string) config('services.stripe.prices.business') => 'business',
            default => 'starter',
        };
    }
}
