<?php

namespace App\Core\Console\Commands;

use App\Core\Enums\SubscriptionPlan;
use Illuminate\Console\Command;
use Stripe\StripeClient;

class SyncStripePlans extends Command
{
    protected $signature = 'stripe:sync-plans
        {--currency=usd : Currency for prices}
        {--dry-run : Preview changes without making API calls}';

    protected $description = 'Create or update Stripe products and prices for all SubscriptionPlan tiers';

    private StripeClient $stripe;

    public function __construct()
    {
        parent::__construct();
        $this->stripe = new StripeClient(config('services.stripe.secret'));
    }

    public function handle(): int
    {
        $currency = $this->option('currency');
        $dryRun = $this->option('dry-run');
        $results = [];

        foreach (SubscriptionPlan::cases() as $plan) {
            if ($plan === SubscriptionPlan::Enterprise) {
                $this->warn("Skipping {$plan->label()} — Enterprise uses custom pricing");

                continue;
            }

            if ($plan->monthlyPriceCents() === 0) {
                $this->warn("Skipping {$plan->label()} — \$0 plan (no Stripe product needed)");

                continue;
            }

            $this->info("Processing {$plan->label()}...");

            if ($dryRun) {
                $results[] = [
                    'plan' => $plan->label(),
                    'product_name' => "Aquerii {$plan->label()}",
                    'monthly_price_cents' => $plan->monthlyPriceCents(),
                    'annual_price_cents' => $plan->monthlyPriceCents() * 12,
                ];

                continue;
            }

            $product = $this->findOrCreateProduct($plan);

            $monthlyPrice = $this->findOrCreatePrice($product->id, $plan->monthlyPriceCents(), $currency, 'month');
            $annualPrice = $this->findOrCreatePrice($product->id, $plan->monthlyPriceCents() * 12, $currency, 'year');

            $results[] = [
                'plan' => $plan->label(),
                'product_id' => $product->id,
                'monthly_price_id' => $monthlyPrice->id,
                'annual_price_id' => $annualPrice->id,
            ];

            $this->line("  Product: {$product->id}");
            $this->line("  Monthly price: {$monthlyPrice->id} ({$plan->monthlyPriceCents()} {$currency})");
            $this->line("  Annual price: {$annualPrice->id} (".$plan->monthlyPriceCents() * 12 ." {$currency})");
        }

        $this->table(
            ['Plan', 'Product ID', 'Monthly Price ID', 'Annual Price ID'],
            $results
        );

        $this->newLine();
        $this->line('Add these price IDs to your .env file:');
        $this->newLine();

        foreach ($results as $r) {
            $key = strtoupper($r['plan']);
            $monthly = $r['monthly_price_id'] ?? 'set-me';
            $this->line("STRIPE_PRICE_{$key}={$monthly}");
        }

        return self::SUCCESS;
    }

    private function findOrCreateProduct(SubscriptionPlan $plan): object
    {
        $metadataKey = 'aquerii_plan';
        $existing = $this->stripe->products->all(['limit' => 100, 'active' => true]);

        foreach ($existing->data as $product) {
            if (($product->metadata[$metadataKey] ?? null) === $plan->value) {
                $monthlyPrice = $plan->monthlyPriceCents() / 100;
                $currency = $this->option('currency');

                return $this->stripe->products->update($product->id, [
                    'name' => "Aquerii {$plan->label()}",
                    'description' => "Aquerii {$plan->label()} plan — {$monthlyPrice} {$currency}/mo",
                ]);
            }
        }

        return $this->stripe->products->create([
            'name' => "Aquerii {$plan->label()}",
            'description' => "Aquerii {$plan->label()} plan",
            'metadata' => [$metadataKey => $plan->value],
        ]);
    }

    private function findOrCreatePrice(string $productId, int $unitAmount, string $currency, string $interval): object
    {
        $existing = $this->stripe->prices->all([
            'product' => $productId,
            'limit' => 10,
            'active' => true,
        ]);

        foreach ($existing->data as $price) {
            if ($price->recurring?->interval === $interval && $price->unit_amount === $unitAmount) {
                return $price;
            }
        }

        return $this->stripe->prices->create([
            'product' => $productId,
            'unit_amount' => $unitAmount,
            'currency' => $currency,
            'recurring' => ['interval' => $interval],
            'metadata' => ['aquerii_billing_period' => $interval],
        ]);
    }
}
