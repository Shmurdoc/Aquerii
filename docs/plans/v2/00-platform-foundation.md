# Phase 0 — Platform Foundation

## Objective
Establish the SaaS subscription engine, feature flag system, and super-admin foundation that the entire business model rests on. No customer-facing features yet — this is the invisible plumbing.

## Design Decisions

### Subscription Tiers
```
Free Tier:
  - 1 workspace, 3 seats, 1 board, 100MB storage
  - Basic CRM (no pipelines), basic documents
  - No AI, no automation, no email

Growth Tier ($29/mo):
  - 3 workspaces, 15 seats, 50 boards, 10GB storage
  - Full CRM, documents, email (1 account)
  - 500 AI credits/mo, 10 automation rules

Business Tier ($99/mo):
  - 10 workspaces, 100 seats, unlimited boards, 100GB storage
  - All modules: CRM, ERP, Email, Support, Marketing, Automation
  - 5000 AI credits/mo, unlimited automation rules

Enterprise ($custom):
  - Unlimited everything, SSO, dedicated support, custom SLA
  - Audit logging, advanced permissions, white-label
  - On-premise option
```

### Feature Flag System
Each feature is a `FeatureFlag` row in the database. Workspaces check `FeatureFlag::isEnabledForWorkspace($key, $workspaceId)`.

Backend: `app/Core/Services/FeatureService.php`
Frontend: `useFeature('crm_pipelines')` React hook

Key: `module.crm_pipelines`, `module.ai`, `module.automation`, `module.email`, `module.erp`, `module.support`, `module.marketing`

### Plan → Features Mapping
Feature flags are grouped into plans via `app/Core/Enums/SubscriptionPlan.php`. Each plan has a `features(): array` method.

## Tasks

### 0.1 — SubscriptionPlan Enum
- File: `app/Core/Enums/SubscriptionPlan.php`
- Values: Free, Growth, Business, Enterprise
- Methods: `features(): array`, `seatLimit(): int`, `storageLimit(): int`, `aiCredits(): int`, `boardLimit(): int`

### 0.2 — FeatureFlag Seeder
- Seed feature flags for all modules
- Create `FeatureService` with `isEnabledForWorkspace($key, $workspaceId)`
- Respect plan-level feature limits

### 0.3 — Plan Enforcement Middleware
- Middleware: `CheckFeatureAccess` — applied to module route groups
- Returns 402 `FEATURE_NOT_AVAILABLE` with upgrade prompt if workspace plan doesn't include feature
- Bypassable for admin/owner roles

### 0.4 — Billing Plan Upgrade Flow
- Update `BillingController` to use `SubscriptionPlan` enum
- Checkout page shows plan features comparison
- Post-payment webhook upgrades workspace plan
- Proration logic for mid-cycle upgrades

### 0.5 — Database: plan_features table
- Migration: `create_plan_features_table`
- Columns: `id`, `plan_key`, `feature_key`, `feature_value` (JSON), timestamps
- Allows admin to override plan limits without code changes

## Files Modified
- `app/Core/Enums/SubscriptionPlan.php` (new)
- `app/Core/Services/FeatureService.php` (new)
- `app/Core/Http/Middleware/CheckFeatureAccess.php` (new)
- `routes/api.php` (apply middleware to module groups)
- `app/Modules/Billing/` (update plan handling)
- `database/migrations/` (plan_features table)
- `database/seeders/FeatureFlagSeeder.php`

## CI Gate
```bash
php artisan test --testsuite=Feature --filter="Billing|Auth"
```

## Commit Message
`feat(platform): add subscription plan enum and feature flag enforcement system`
