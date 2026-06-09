<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\StripeClient;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook as StripeWebhook;

class WebhookController extends Controller
{
    private StripeClient $stripe;

    public function __construct()
    {
        $this->stripe = new StripeClient(config('services.stripe.secret'));
    }

    // POST /webhooks/stripe
    public function stripe(Request $request): Response
    {
        $payload = $request->getContent();
        $sig     = $request->header('Stripe-Signature');

        try {
            $event = StripeWebhook::constructEvent(
                $payload,
                $sig,
                config('services.stripe.webhook_secret')
            );
        } catch (SignatureVerificationException $e) {
            Log::warning('Stripe webhook signature mismatch', ['error' => $e->getMessage()]);
            return response('Invalid signature', 400);
        }

        match ($event->type) {
            'customer.subscription.created',
            'customer.subscription.updated'  => $this->handleSubscriptionUpsert($event->data->object),
            'customer.subscription.deleted'  => $this->handleSubscriptionDeleted($event->data->object),
            'invoice.payment_succeeded'      => $this->handleInvoicePaid($event->data->object),
            'invoice.payment_failed'         => $this->handleInvoiceFailed($event->data->object),
            default                          => null,
        };

        return response('OK', 200);
    }

    // POST /webhooks/payfast
    public function payfast(Request $request): Response
    {
        // Verify PayFast ITN
        if (! $this->verifyPayfast($request)) {
            Log::warning('PayFast ITN verification failed', $request->all());
            return response('Invalid', 400);
        }

        $workspaceId = $request->input('custom_str1');
        $plan        = $request->input('custom_str2');
        $status      = $request->input('payment_status');
        $pfSubToken  = $request->input('token'); // recurring token

        if ($status !== 'COMPLETE') {
            return response('OK', 200);
        }

        $workspace = Workspace::find($workspaceId);
        if (! $workspace) {
            return response('Not found', 404);
        }

        DB::transaction(function () use ($workspace, $plan, $pfSubToken, $request) {
            $workspace->update([
                'plan'                  => $plan,
                'payfast_subscription_token' => $pfSubToken ?? $workspace->payfast_subscription_token,
                'plan_expires_at'       => now()->addMonth(),
            ]);

            DB::table('billing_events')->insert([
                'id'           => \Illuminate\Support\Str::uuid(),
                'workspace_id' => $workspace->id,
                'provider'     => 'payfast',
                'event_type'   => 'payment_succeeded',
                'payload'      => json_encode($request->all()),
                'created_at'   => now(),
            ]);
        });

        return response('OK', 200);
    }

    // ─── Stripe handlers ───────────────────────────────────────────────────────

    private function handleSubscriptionUpsert(object $sub): void
    {
        $workspaceId = $sub->metadata->workspace_id ?? null;
        if (! $workspaceId) return;

        $plan = $this->stripePriceToplan($sub->items->data[0]->price->id ?? '');

        DB::transaction(function () use ($workspaceId, $sub, $plan) {
            Workspace::where('id', $workspaceId)->update([
                'stripe_subscription_id' => $sub->id,
                'plan'                   => $plan,
                'plan_expires_at'        => \Carbon\Carbon::createFromTimestamp($sub->current_period_end),
            ]);

            DB::table('billing_events')->insert([
                'id'           => \Illuminate\Support\Str::uuid(),
                'workspace_id' => $workspaceId,
                'provider'     => 'stripe',
                'event_type'   => 'subscription_upsert',
                'payload'      => json_encode((array) $sub),
                'created_at'   => now(),
            ]);
        });
    }

    private function handleSubscriptionDeleted(object $sub): void
    {
        $workspaceId = $sub->metadata->workspace_id ?? null;
        if (! $workspaceId) return;

        Workspace::where('id', $workspaceId)->update([
            'plan'                   => 'free',
            'stripe_subscription_id' => null,
            'plan_expires_at'        => null,
        ]);
    }

    private function handleInvoicePaid(object $invoice): void
    {
        $customerId = $invoice->customer;
        $workspace  = Workspace::where('stripe_customer_id', $customerId)->first();
        if (! $workspace) return;

        DB::table('billing_events')->insert([
            'id'           => \Illuminate\Support\Str::uuid(),
            'workspace_id' => $workspace->id,
            'provider'     => 'stripe',
            'event_type'   => 'invoice_paid',
            'payload'      => json_encode(['invoice_id' => $invoice->id, 'amount' => $invoice->amount_paid]),
            'created_at'   => now(),
        ]);
    }

    private function handleInvoiceFailed(object $invoice): void
    {
        $customerId = $invoice->customer;
        $workspace  = Workspace::where('stripe_customer_id', $customerId)->first();
        if (! $workspace) return;

        Log::warning('Stripe invoice payment failed', [
            'workspace_id' => $workspace->id,
            'invoice_id'   => $invoice->id,
        ]);
    }

    // ─── PayFast verification ──────────────────────────────────────────────────

    private function verifyPayfast(Request $request): bool
    {
        $data = $request->except('signature');
        ksort($data);

        $pfParamString = collect($data)
            ->reject(fn($v) => $v === '')
            ->map(fn($v, $k) => "$k=" . urlencode(trim((string) $v)))
            ->implode('&');

        $passphrase = config('services.payfast.passphrase');
        if ($passphrase) {
            $pfParamString .= '&passphrase=' . urlencode(trim($passphrase));
        }

        $signature = md5($pfParamString);

        if ($signature !== $request->input('signature')) {
            return false;
        }

        // Validate source IP (PayFast valid IPs)
        $validIps = ['197.97.145.144', '197.97.145.145', '197.97.145.146', '197.97.145.147'];
        if (! in_array($request->ip(), $validIps) && config('services.payfast.sandbox')) {
            return true; // Allow all IPs in sandbox
        }

        return in_array($request->ip(), $validIps);
    }

    private function stripePriceToplan(string $priceId): string
    {
        return match ($priceId) {
            config('services.stripe.prices.growth')   => 'growth',
            config('services.stripe.prices.business') => 'business',
            default                                   => 'starter',
        };
    }
}
