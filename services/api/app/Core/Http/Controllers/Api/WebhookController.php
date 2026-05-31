<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\StripeObject;
use Stripe\Webhook as StripeWebhook;

class WebhookController extends Controller
{
    private ?StripeClient $stripe = null;

    private function stripeClient(): StripeClient
    {
        return $this->stripe ??= new StripeClient(config('services.stripe.secret'));
    }

    // POST /webhooks/stripe
    public function stripe(Request $request): Response
    {
        $payload = $request->getContent();
        $sig = $request->header('Stripe-Signature');
        $headers = $request->headers->all();
        $eventLogId = null;

        try {
            $event = StripeWebhook::constructEvent(
                $payload,
                $sig,
                config('services.stripe.webhook_secret')
            );

            $workspaceId = $event->data->object->metadata->workspace_id ?? null;
            $eventLogId = $this->createIntegrationEvent(
                processor: 'stripe',
                eventType: (string) $event->type,
                payload: json_decode($payload, true) ?? ['raw' => $payload],
                headers: $headers,
                processorEventId: (string) ($event->id ?? ''),
                workspaceId: $workspaceId
            );
        } catch (SignatureVerificationException $e) {
            Log::warning('Stripe webhook signature mismatch', ['error' => $e->getMessage()]);

            $this->createIntegrationEvent(
                processor: 'stripe',
                eventType: 'signature_verification_failed',
                payload: json_decode($payload, true) ?? ['raw' => $payload],
                headers: $headers,
                processorEventId: null,
                workspaceId: null,
                status: 'rejected',
                error: $e->getMessage()
            );

            return response('Invalid signature', 400);
        }

        try {
            match ($event->type) {
                'customer.subscription.created',
                'customer.subscription.updated' => $this->handleSubscriptionUpsert($event->data->object),
                'customer.subscription.deleted' => $this->handleSubscriptionDeleted($event->data->object),
                'invoice.payment_succeeded' => $this->handleInvoicePaid($event->data->object),
                'invoice.payment_failed' => $this->handleInvoiceFailed($event->data->object),
                default => null,
            };

            if ($eventLogId) {
                $this->markIntegrationEventProcessed($eventLogId);
            }
        } catch (\Throwable $e) {
            if ($eventLogId) {
                $this->markIntegrationEventFailed($eventLogId, $e->getMessage());
            }
            throw $e;
        }

        return response('OK', 200);
    }

    // POST /webhooks/payfast
    public function payfast(Request $request): Response
    {
        $payload = $request->all();
        $headers = $request->headers->all();
        $workspaceId = $request->input('custom_str1');

        // Verify PayFast ITN
        if (! $this->verifyPayfast($request)) {
            Log::warning('PayFast ITN verification failed', $request->all());

            $this->createIntegrationEvent(
                processor: 'payfast',
                eventType: 'verification_failed',
                payload: $payload,
                headers: $headers,
                processorEventId: (string) ($request->input('pf_payment_id') ?? ''),
                workspaceId: $workspaceId,
                status: 'rejected',
                error: 'PayFast ITN verification failed'
            );

            return response('Invalid', 400);
        }

        $plan = $request->input('custom_str2');
        $status = $request->input('payment_status');
        $pfSubToken = $request->input('token'); // recurring token
        $eventLogId = $this->createIntegrationEvent(
            processor: 'payfast',
            eventType: 'payment_notification',
            payload: $payload,
            headers: $headers,
            processorEventId: (string) ($request->input('pf_payment_id') ?? ''),
            workspaceId: $workspaceId
        );

        if ($status !== 'COMPLETE') {
            $this->markIntegrationEventProcessed($eventLogId);

            return response('OK', 200);
        }

        $workspace = Workspace::find($workspaceId);
        if (! $workspace) {
            $this->markIntegrationEventFailed($eventLogId, 'Workspace not found');

            return response('Not found', 404);
        }

        DB::transaction(function () use ($workspace, $plan, $pfSubToken, $request) {
            $workspace->update([
                'plan' => $plan,
                'payfast_subscription_token' => $pfSubToken ?? $workspace->payfast_subscription_token,
                'plan_expires_at' => now()->addMonth(),
            ]);

            $this->upsertBillingEvent(
                workspaceId: (string) $workspace->id,
                processor: 'payfast',
                processorEventId: (string) ($request->input('pf_payment_id') ?? Str::uuid()),
                eventType: 'payment_succeeded',
                payload: $request->all(),
            );
        });

        $this->markIntegrationEventProcessed($eventLogId);

        return response('OK', 200);
    }

    // ─── Stripe handlers ───────────────────────────────────────────────────────

    private function handleSubscriptionUpsert(object $sub): void
    {
        $workspaceId = $sub->metadata->workspace_id ?? null;
        if (! $workspaceId) {
            return;
        }

        $plan = $this->stripePriceToplan($sub->items->data[0]->price->id ?? '');

        DB::transaction(function () use ($workspaceId, $sub, $plan) {
            Workspace::where('id', $workspaceId)->update([
                'stripe_subscription_id' => $sub->id,
                'plan' => $plan,
                'plan_expires_at' => Carbon::createFromTimestamp($sub->current_period_end),
            ]);

            $this->upsertBillingEvent(
                workspaceId: (string) $workspaceId,
                processor: 'stripe',
                processorEventId: (string) $sub->id,
                eventType: 'subscription_upsert',
                payload: $sub instanceof StripeObject ? $sub->toArray() : (array) $sub,
            );
        });
    }

    private function handleSubscriptionDeleted(object $sub): void
    {
        $workspaceId = $sub->metadata->workspace_id ?? null;
        if (! $workspaceId) {
            return;
        }

        Workspace::where('id', $workspaceId)->update([
            'plan' => 'free',
            'stripe_subscription_id' => null,
            'plan_expires_at' => null,
        ]);
    }

    private function handleInvoicePaid(object $invoice): void
    {
        $customerId = $invoice->customer;
        $workspace = Workspace::where('stripe_customer_id', $customerId)->first();
        if (! $workspace) {
            return;
        }

        $this->upsertBillingEvent(
            workspaceId: (string) $workspace->id,
            processor: 'stripe',
            processorEventId: (string) $invoice->id,
            eventType: 'invoice_paid',
            payload: ['invoice_id' => $invoice->id, 'amount' => $invoice->amount_paid],
        );
    }

    private function handleInvoiceFailed(object $invoice): void
    {
        $customerId = $invoice->customer;
        $workspace = Workspace::where('stripe_customer_id', $customerId)->first();
        if (! $workspace) {
            return;
        }

        $workspace->update([
            'plan_status' => 'past_due',
            'plan_expires_at' => Carbon::createFromTimestamp($invoice->period_end ?? $invoice->created),
        ]);

        $this->upsertBillingEvent(
            workspaceId: (string) $workspace->id,
            processor: 'stripe',
            processorEventId: (string) $invoice->id,
            eventType: 'invoice_payment_failed',
            payload: ['invoice_id' => $invoice->id, 'amount' => $invoice->amount_due],
        );

        Log::warning('Stripe invoice payment failed', [
            'workspace_id' => $workspace->id,
            'invoice_id' => $invoice->id,
        ]);
    }

    // ─── PayFast verification ──────────────────────────────────────────────────

    private function verifyPayfast(Request $request): bool
    {
        $data = $request->except('signature');
        ksort($data);

        $pfParamString = collect($data)
            ->reject(fn ($v) => $v === '')
            ->map(fn ($v, $k) => "$k=".urlencode(trim((string) $v)))
            ->implode('&');

        $passphrase = config('services.payfast.passphrase');
        if ($passphrase) {
            $pfParamString .= '&passphrase='.urlencode(trim($passphrase));
        }

        $signature = md5($pfParamString);

        if ($signature !== $request->input('signature')) {
            return false;
        }

        // Validate source IP (PayFast valid IPs)
        // In sandbox mode we skip the IP check so local/test environments work.
        // In production (sandbox=false) the IP MUST be in the allowlist.
        if (config('services.payfast.sandbox')) {
            return true;
        }

        $validIps = ['197.97.145.144', '197.97.145.145', '197.97.145.146', '197.97.145.147'];

        return in_array($request->ip(), $validIps);
    }

    private function stripePriceToplan(string $priceId): string
    {
        return match ($priceId) {
            config('services.stripe.prices.growth') => 'growth',
            config('services.stripe.prices.business') => 'business',
            default => 'starter',
        };
    }

    private function createIntegrationEvent(
        string $processor,
        string $eventType,
        array $payload,
        array $headers,
        ?string $processorEventId,
        ?string $workspaceId,
        string $status = 'received',
        ?string $error = null
    ): string {
        $id = (string) Str::uuid();

        DB::table('integration_webhook_events')->insert([
            'id' => $id,
            'workspace_id' => $workspaceId,
            'processor' => $processor,
            'processor_event_id' => $processorEventId,
            'event_type' => $eventType,
            'payload' => json_encode($payload),
            'headers' => json_encode($headers),
            'status' => $status,
            'retry_count' => 0,
            'next_retry_at' => null,
            'processed_at' => $status === 'processed' ? now() : null,
            'last_error' => $error,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function markIntegrationEventProcessed(string $eventId): void
    {
        DB::table('integration_webhook_events')
            ->where('id', $eventId)
            ->update([
                'status' => 'processed',
                'processed_at' => now(),
                'last_error' => null,
                'updated_at' => now(),
            ]);
    }

    private function markIntegrationEventFailed(string $eventId, string $error): void
    {
        DB::table('integration_webhook_events')
            ->where('id', $eventId)
            ->update([
                'status' => 'failed',
                'next_retry_at' => now()->addMinutes(5),
                'last_error' => mb_substr($error, 0, 4000),
                'updated_at' => now(),
            ]);
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
}
