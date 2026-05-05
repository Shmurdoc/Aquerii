<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Stripe\StripeClient;
use Illuminate\Support\Facades\Log;

class BillingController extends Controller
{
    private StripeClient $stripe;

    public function __construct()
    {
        $this->stripe = new StripeClient(config('services.stripe.secret'));
    }

    // GET /workspaces/{workspace}/billing
    public function show(Request $request, Workspace $workspace): JsonResponse
    {
        $sub = $workspace->stripe_subscription_id
            ? $this->stripe->subscriptions->retrieve($workspace->stripe_subscription_id, [
                'expand' => ['items.data.price.product'],
              ])
            : null;

        return response()->json([
            'data' => [
                'plan'              => $workspace->plan,
                'status'            => $sub?->status ?? 'none',
                'current_period_end'=> $sub?->current_period_end,
                'cancel_at_period_end' => $sub?->cancel_at_period_end ?? false,
                'seat_count'        => $workspace->seat_count,
                'storage_used_bytes'=> $workspace->storage_used_bytes,
            ],
        ]);
    }

    // POST /workspaces/{workspace}/billing/checkout
    public function createCheckout(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'price_id'    => 'required|string',
            'success_url' => 'required|url',
            'cancel_url'  => 'required|url',
        ]);

        // Ensure Stripe customer
        if (! $workspace->stripe_customer_id) {
            $customer = $this->stripe->customers->create([
                'email'    => $request->user()->email,
                'name'     => $workspace->name,
                'metadata' => ['workspace_id' => $workspace->id],
            ]);
            $workspace->update(['stripe_customer_id' => $customer->id]);
        }

        $session = $this->stripe->checkout->sessions->create([
            'customer'              => $workspace->stripe_customer_id,
            'mode'                  => 'subscription',
            'line_items'            => [[
                'price'    => $validated['price_id'],
                'quantity' => $workspace->seat_count ?: 1,
            ]],
            'success_url'           => $validated['success_url'],
            'cancel_url'            => $validated['cancel_url'],
            'subscription_data'     => [
                'metadata' => ['workspace_id' => $workspace->id],
            ],
            'allow_promotion_codes' => true,
        ]);

        return response()->json(['data' => ['url' => $session->url]], 201);
    }

    // POST /workspaces/{workspace}/billing/portal
    public function createPortal(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless($workspace->stripe_customer_id, 422, 'No billing account found.');

        $session = $this->stripe->billingPortal->sessions->create([
            'customer'   => $workspace->stripe_customer_id,
            'return_url' => $request->input('return_url', config('app.frontend_url')),
        ]);

        return response()->json(['data' => ['url' => $session->url]]);
    }

    // DELETE /workspaces/{workspace}/billing/subscription
    public function cancelSubscription(Workspace $workspace): JsonResponse
    {
        abort_unless($workspace->stripe_subscription_id, 422, 'No active subscription.');

        $this->stripe->subscriptions->update($workspace->stripe_subscription_id, [
            'cancel_at_period_end' => true,
        ]);

        return response()->json(['data' => ['cancelled' => true]]);
    }

    // POST /workspaces/{workspace}/billing/payfast/checkout
    public function payfastCheckout(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'plan'        => 'required|string|in:starter,growth,business',
            'return_url'  => 'required|url',
            'cancel_url'  => 'required|url',
            'notify_url'  => 'required|url',
        ]);

        $planPrices = [
            'starter'  => 19900,  // ZAR cents
            'growth'   => 49900,
            'business' => 99900,
        ];

        $amount = $planPrices[$validated['plan']] / 100; // PayFast uses rand

        $data = [
            'merchant_id'  => config('services.payfast.merchant_id'),
            'merchant_key' => config('services.payfast.merchant_key'),
            'return_url'   => $validated['return_url'],
            'cancel_url'   => $validated['cancel_url'],
            'notify_url'   => $validated['notify_url'],
            'm_payment_id' => $workspace->id,
            'amount'       => number_format($amount, 2, '.', ''),
            'item_name'    => 'Aquerii ' . ucfirst($validated['plan']) . ' Plan',
            'subscription_type' => 1,
            'billing_date'      => now()->format('Y-m-d'),
            'recurring_amount'  => number_format($amount, 2, '.', ''),
            'frequency'         => 3, // monthly
            'cycles'            => 0, // indefinite
            'custom_str1'       => $workspace->id,
            'custom_str2'       => $validated['plan'],
        ];

        // Generate PayFast signature
        $pfParamString = collect($data)
            ->reject(fn($v) => $v === '')
            ->map(fn($v, $k) => "$k=" . urlencode(trim((string) $v)))
            ->implode('&');

        $passphrase = config('services.payfast.passphrase');
        if ($passphrase) {
            $pfParamString .= '&passphrase=' . urlencode(trim($passphrase));
        }
        $data['signature'] = md5($pfParamString);

        $payfastUrl = config('services.payfast.sandbox')
            ? 'https://sandbox.payfast.co.za/eng/process'
            : 'https://www.payfast.co.za/eng/process';

        return response()->json([
            'data' => [
                'url'    => $payfastUrl,
                'fields' => $data,
            ],
        ]);
    }
}
