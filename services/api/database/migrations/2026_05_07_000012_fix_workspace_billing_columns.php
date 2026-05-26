<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Aligns workspace billing column names with all application code.
 *
 * All controllers and jobs use:
 *   - stripe_subscription_id      (was subscription_id_stripe)
 *   - stripe_customer_id          (was customer_id_stripe)
 *   - stripe_subscription_item_id (was missing)
 *   - plan_expires_at             (was missing)
 *   - icon, color                 (workspace branding, was missing)
 *   - payfast_subscription_token  (was missing)
 *
 * billing_events processor_event_id is nullable in practice (PayFast ITN has
 * no unique event ID); allow null to prevent insert failures.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            // Rename Stripe columns to match all application code
            $table->renameColumn('subscription_id_stripe', 'stripe_subscription_id');
            $table->renameColumn('customer_id_stripe', 'stripe_customer_id');

            // Add missing columns referenced in code
            $table->string('stripe_subscription_item_id')->nullable()->after('stripe_subscription_id');
            $table->timestampTz('plan_expires_at')->nullable()->after('trial_ends_at');
            $table->string('icon', 10)->nullable()->after('cover_url');
            $table->string('color', 20)->nullable()->after('icon');
            $table->string('payfast_subscription_token')->nullable()->after('subscription_id_payfast');
        });

        // Allow processor_event_id to be null (PayFast ITN provides no unique event ID)
        Schema::table('billing_events', function (Blueprint $table) {
            $table->string('processor_event_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->renameColumn('stripe_subscription_id', 'subscription_id_stripe');
            $table->renameColumn('stripe_customer_id', 'customer_id_stripe');
            $table->dropColumn([
                'stripe_subscription_item_id',
                'plan_expires_at',
                'icon',
                'color',
                'payfast_subscription_token',
            ]);
        });

        Schema::table('billing_events', function (Blueprint $table) {
            $table->string('processor_event_id')->nullable(false)->change();
        });
    }
};
