<?php

namespace App\Core\Enums;

use App\Core\Models\Workspace;

enum SubscriptionPlan: string
{
    case Free = 'free';
    case Starter = 'starter';
    case Growth = 'growth';
    case Business = 'business';
    case Enterprise = 'enterprise';

    public function label(): string
    {
        return match ($this) {
            self::Free => 'Free',
            self::Starter => 'Starter',
            self::Growth => 'Growth',
            self::Business => 'Business',
            self::Enterprise => 'Enterprise',
        };
    }

    public function monthlyPriceCents(): int
    {
        return match ($this) {
            self::Free => 0,
            self::Starter => 19900,
            self::Growth => 49900,
            self::Business => 99900,
            self::Enterprise => 0,
        };
    }

    public function seatLimit(): int
    {
        return match ($this) {
            self::Free => 3,
            self::Starter => 10,
            self::Growth => 25,
            self::Business => 100,
            self::Enterprise => 9999,
        };
    }

    public function boardLimit(): int
    {
        return match ($this) {
            self::Free => 2,
            self::Starter => 10,
            self::Growth => 50,
            self::Business => 9999,
            self::Enterprise => 9999,
        };
    }

    public function storageLimitBytes(): int
    {
        return match ($this) {
            self::Free => 100 * 1024 * 1024,
            self::Starter => 5 * 1024 * 1024 * 1024,
            self::Growth => 25 * 1024 * 1024 * 1024,
            self::Business => 100 * 1024 * 1024 * 1024,
            self::Enterprise => 9999 * 1024 * 1024 * 1024,
        };
    }

    public function aiCreditsMonthly(): int
    {
        return match ($this) {
            self::Free => 0,
            self::Starter => 200,
            self::Growth => 1000,
            self::Business => 5000,
            self::Enterprise => 99999,
        };
    }

    public function automationRuleLimit(): int
    {
        return match ($this) {
            self::Free => 0,
            self::Starter => 5,
            self::Growth => 25,
            self::Business => 9999,
            self::Enterprise => 9999,
        };
    }

    public function emailAccountLimit(): int
    {
        return match ($this) {
            self::Free => 0,
            self::Starter => 1,
            self::Growth => 3,
            self::Business => 10,
            self::Enterprise => 999,
        };
    }

    public function crmPipelineLimit(): int
    {
        return match ($this) {
            self::Free => 1,
            self::Starter => 3,
            self::Growth => 10,
            self::Business => 999,
            self::Enterprise => 999,
        };
    }

    public function invoiceMonthlyLimit(): int
    {
        return match ($this) {
            self::Free => 0,
            self::Starter => 20,
            self::Growth => 100,
            self::Business => 9999,
            self::Enterprise => 9999,
        };
    }

    public function rateLimitPerMinute(): int
    {
        return match ($this) {
            self::Free => 30,
            self::Starter => 60,
            self::Growth => 120,
            self::Business => 300,
            self::Enterprise => 1000,
        };
    }

    public function features(): array
    {
        return match ($this) {
            self::Free => [
                'module.boards' => true,
                'module.crm_basic' => true,
                'module.documents' => true,
                'module.crm_pipelines' => false,
                'module.ai' => false,
                'module.automation' => false,
                'module.email' => false,
                'module.erp' => false,
                'module.support' => false,
                'module.marketing' => false,
                'module.hr' => false,
                'billing.stripe' => false,
                'api.export' => false,
            ],
            self::Starter => [
                'module.boards' => true,
                'module.crm_basic' => true,
                'module.crm_pipelines' => true,
                'module.documents' => true,
                'module.ai' => true,
                'module.automation' => true,
                'module.email' => true,
                'module.erp' => false,
                'module.support' => false,
                'module.marketing' => false,
                'module.hr' => false,
                'billing.stripe' => true,
                'api.export' => true,
            ],
            self::Growth => [
                'module.boards' => true,
                'module.crm_basic' => true,
                'module.crm_pipelines' => true,
                'module.documents' => true,
                'module.ai' => true,
                'module.automation' => true,
                'module.email' => true,
                'module.erp' => true,
                'module.support' => true,
                'module.marketing' => false,
                'module.hr' => false,
                'billing.stripe' => true,
                'api.export' => true,
            ],
            self::Business => [
                'module.boards' => true,
                'module.crm_basic' => true,
                'module.crm_pipelines' => true,
                'module.documents' => true,
                'module.ai' => true,
                'module.automation' => true,
                'module.email' => true,
                'module.erp' => true,
                'module.support' => true,
                'module.marketing' => true,
                'module.hr' => true,
                'billing.stripe' => true,
                'api.export' => true,
            ],
            self::Enterprise => [
                'module.boards' => true,
                'module.crm_basic' => true,
                'module.crm_pipelines' => true,
                'module.documents' => true,
                'module.ai' => true,
                'module.automation' => true,
                'module.email' => true,
                'module.erp' => true,
                'module.support' => true,
                'module.marketing' => true,
                'module.hr' => true,
                'billing.stripe' => true,
                'api.export' => true,
            ],
        };
    }

    public function hasFeature(string $featureKey): bool
    {
        return $this->features()[$featureKey] ?? false;
    }

    public function feature(string $key): int
    {
        return match ($key) {
            'seats' => $this->seatLimit(),
            'boards' => $this->boardLimit(),
            'storage' => $this->storageLimitBytes(),
            'ai_credits' => $this->aiCreditsMonthly(),
            'automation_rules' => $this->automationRuleLimit(),
            'email_accounts' => $this->emailAccountLimit(),
            'crm_pipelines' => $this->crmPipelineLimit(),
            'max_invoices' => $this->invoiceMonthlyLimit(),
            'rate_limit' => $this->rateLimitPerMinute(),
            default => -1,
        };
    }

    public function limits(): array
    {
        return [
            'seats' => $this->feature('seats'),
            'boards' => $this->feature('boards'),
            'storage' => $this->feature('storage'),
            'ai_credits' => $this->feature('ai_credits'),
            'automation_rules' => $this->feature('automation_rules'),
            'email_accounts' => $this->feature('email_accounts'),
            'crm_pipelines' => $this->feature('crm_pipelines'),
            'max_invoices' => $this->feature('max_invoices'),
            'rate_limit' => $this->feature('rate_limit'),
        ];
    }

    public static function fromWorkspace(Workspace $workspace): self
    {
        return self::tryFrom($workspace->plan) ?? self::Free;
    }
}
