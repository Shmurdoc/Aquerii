<?php

namespace Database\Seeders;

use App\Core\Enums\SubscriptionPlan;
use App\Core\Models\FeatureFlag;
use Illuminate\Database\Seeder;

class FeaturesSeeder extends Seeder
{
    public function run(): void
    {
        $moduleFlags = [
            // Module-level feature flags
            ['key' => 'module.boards', 'description' => 'Board/Project Management (Kanban, Table, Calendar, Whiteboard)', 'enabled' => true],
            ['key' => 'module.crm_basic', 'description' => 'Basic CRM: contacts, companies', 'enabled' => true],
            ['key' => 'module.crm_pipelines', 'description' => 'CRM Pipelines: deals, stages, scoring, forecasting', 'enabled' => true],
            ['key' => 'module.documents', 'description' => 'Rich text documents with BlockNote editor', 'enabled' => true],
            ['key' => 'module.ai', 'description' => 'AI chat, document analysis, deal scoring, automation', 'enabled' => true],
            ['key' => 'module.automation', 'description' => 'Automation rules engine with triggers and actions', 'enabled' => true],
            ['key' => 'module.email', 'description' => 'Email integration: IMAP accounts, threaded view, AI suggestions', 'enabled' => true],
            ['key' => 'module.erp', 'description' => 'ERP: invoicing, purchasing, sales orders, inventory, accounting', 'enabled' => true],
            ['key' => 'module.support', 'description' => 'Support ticket system with SLA policies and KB', 'enabled' => true],
            ['key' => 'module.marketing', 'description' => 'Marketing campaigns, email templates, segments', 'enabled' => true],
            ['key' => 'module.hr', 'description' => 'HR: employee directory, attendance, leave, expenses', 'enabled' => true],
            ['key' => 'billing.stripe', 'description' => 'Stripe payment processing', 'enabled' => true],
            ['key' => 'api.export', 'description' => 'CSV/PDF export for all entities', 'enabled' => true],
        ];

        foreach ($moduleFlags as $flag) {
            FeatureFlag::withoutEvents(function () use ($flag) {
                FeatureFlag::updateOrCreate(
                    ['key' => $flag['key']],
                    [
                        'enabled' => $flag['enabled'],
                        'description' => $flag['description'],
                        'workspace_ids' => [],
                    ]
                );
            });
        }

        // Seed plan overrides for enterprise.
        // On re-run: existing rows are matched by (plan_key, feature_key); we do NOT
        // pass `id` in the update values, otherwise every re-seed generates a new UUID
        // and the unique constraint on id trips a constraint violation.
        foreach (SubscriptionPlan::cases() as $plan) {
            foreach ($plan->features() as $featureKey => $enabled) {
                \DB::table('plan_features')->updateOrInsert(
                    ['plan_key' => $plan->value, 'feature_key' => $featureKey],
                    ['feature_value' => json_encode(['enabled' => $enabled])]
                );
            }
        }
    }
}
