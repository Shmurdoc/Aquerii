# Aquerii System Gaps - Implementation Map (Files, Routes, Tests)

Date: 2026-05-29
Input: Gaps/SYSTEM_GAPS_FULL.md + Gaps/SYSTEM_GAPS_EXECUTION_BOARD.md
Purpose: Map each high-priority gap to concrete code touchpoints so execution can start immediately.

## 1) P0 Launch Blockers - Exact Entry Points

| Board ID | Gap | Primary Files | Key Routes/Commands | Test Files (existing/new) |
|---|---|---|---|---|
| P0-01 | Critical-path runtime suite not proven | services/api/phpunit.xml, services/api/tests/Feature/Security/*, services/api/tests/Unit/Scenario/* | php artisan test tests/Feature/Security/ScimAndFieldPermissionsTest.php tests/Feature/Security/ReadinessControlPlaneTest.php tests/Feature/Security/RealWorldReadinessTest.php tests/Unit/Scenario/ScenarioSimulationTest.php | services/api/tests/Feature/Security/ScimAndFieldPermissionsTest.php, services/api/tests/Feature/Security/ReadinessControlPlaneTest.php, services/api/tests/Feature/Security/RealWorldReadinessTest.php, services/api/tests/Unit/Scenario/ScenarioSimulationTest.php |
| P0-02 | Finance immutable posting/approval/period lock | services/api/app/Core/Http/Controllers/Api/FinancialApprovalController.php, services/api/app/Core/Http/Controllers/Api/InvoiceWorkflowController.php, services/api/app/Modules/Invoicing/Http/Controllers/InvoiceController.php, services/api/app/Modules/Invoicing/Models/Invoice.php, services/api/database/migrations/2026_05_29_000090_add_posting_lock_fields_to_invoices.php | workspaces/{workspace}/finance/invoices/{invoice}/submit-approval, workspaces/{workspace}/finance/invoice-approvals/{approval}/approve, workspaces/{workspace}/finance/invoices/{invoice}/reverse, workspaces/{workspace}/invoices/{invoice}/status | services/api/tests/Feature/Security/RealWorldReadinessTest.php (extend), new finance close tests in services/api/tests/Feature/Security/ |
| P0-03 | Reporting trust + drill-down | services/api/app/Core/Http/Controllers/Api/ReportController.php, services/api/app/Core/Http/Controllers/Api/ReportScheduleController.php, services/web/src/components/layout/CommandPalette.tsx, services/web/src/pages/*report* | workspaces/{workspace}/reports/*, workspaces/{workspace}/reports/schedules/* | services/api/tests/Feature/Security/ReadinessControlPlaneTest.php (extend), new report drill-down tests |
| P0-04 | Automation reliability runtime | services/api/app/Modules/Automation/Http/Controllers/AutomationController.php, services/api/app/Jobs/ReplayIntegrationWebhookEvent.php, services/api/app/Core/Services/IntegrationWebhookReplayService.php, services/api/app/Core/Http/Controllers/Api/IntegrationReliabilityController.php | workspaces/{workspace}/automations, workspaces/{workspace}/integrations/webhook-events/{event}/retry, workspaces/{workspace}/integrations/webhook-events/{event}/replay-now | services/api/tests/Feature/Security/RealWorldReadinessTest.php (extend), new queue failure/retry tests |
| P0-05 | Permission coverage verification | services/api/app/Core/Http/Controllers/Api/FieldPermissionController.php, services/api/app/Core/Http/Controllers/Api/ScimController.php, services/api/app/Core/Http/Middleware/AuthenticateScimToken.php, services/api/routes/api.php | workspaces/{workspace}/field-permissions/*, workspaces/{workspace}/scim/tokens*, /api/scim/v2/* | services/api/tests/Feature/Security/ScimAndFieldPermissionsTest.php |
| P0-06 | Core connector hardening (Stripe/Google/Microsoft) | services/api/app/Core/Http/Controllers/Api/BillingController.php, services/api/app/Core/Http/Controllers/Api/WebhookController.php, services/api/app/Modules/CRM/Http/Controllers/CalendarSyncController.php, services/api/config/services.php | webhooks/stripe, webhooks/payfast, workspaces/{workspace}/billing/*, workspaces/{workspace}/crm/calendar-syncs/* | existing billing tests + new connector conformance tests |
| P0-07 | Accounting system-of-record gaps | services/api/app/Modules/Accounting/**, services/api/database/migrations/*account* | workspaces/{workspace}/accounts, workspaces/{workspace}/journal-entries | new accounting feature tests in services/api/tests/Feature/Accounting/ |
| P0-08 | SRE/SLO/chaos readiness | .github/workflows/ci.yml, services/tests/python/system_hardening_audit.py, infra/prometheus/**, infra/alertmanager/** | CI jobs + observability configs | services/tests/python/system_hardening_audit.py + new chaos job scripts |

## 2) P1 Operational Completion - Implementation Targets

| Board ID | Gap | Primary Files | Routes/Surface |
|---|---|---|---|
| P1-01 | Cross-module template governance | services/api/app/Core/**/Template* (new/extend), services/web/src/pages/templates/**, PRODUCTION_READINESS/18-TEMPLATES.md | templates API + module create forms |
| P1-02 | Object-level ACL + explainability | services/api/app/Core/Policies/**, services/api/app/Core/Http/Middleware/**, services/api/app/Core/Http/Controllers/Api/FieldPermissionController.php | policy introspection endpoint (new), field/object permission endpoints |
| P1-03 | Collaboration hierarchy workflows | services/api/app/Core/Http/Controllers/Api/EmployeeGroupController.php, services/api/app/Core/Http/Controllers/Api/CommentController.php, services/api/app/Core/Models/** | employee-groups/*, item comments/mentions/watchers (new) |
| P1-04 | Support enterprise lifecycle depth | services/api/app/Modules/Support/**, services/web/src/pages/support/** | workspaces/{workspace}/support/* |
| P1-05 | Inventory operational depth | services/api/app/Modules/Inventory/**, services/api/app/Modules/Sales/**, services/api/app/Modules/Purchasing/** | workspaces/{workspace}/inventory/*, sales/orders/*, purchases/orders/* |
| P1-06 | Calendar provider sync depth | services/api/app/Modules/CRM/Http/Controllers/CalendarSyncController.php, services/web/src/pages/calendar/** | workspaces/{workspace}/crm/calendar-syncs/* |
| P1-07 | Role-native dashboards | services/web/src/pages/dashboard/**, services/api/app/Core/Http/Controllers/Api/ReportController.php | workspaces/{workspace}/reports/dashboard |
| P1-08 | Document lifecycle controls | services/api/app/Modules/Documents/**, services/web/src/pages/documents/** | workspaces/{workspace}/documents/* |
| P1-09 | CRM/Leads/Sales rigor | services/api/app/Modules/CRM/**, services/web/src/pages/crm/** | workspaces/{workspace}/crm/* |
| P1-10 | Marketing maturity | services/api/app/Modules/Marketing/**, services/web/src/pages/marketing/** | workspaces/{workspace}/marketing/* |
| P1-11 | Audit export + retention | services/api/app/Core/Http/Controllers/Api/AuditLogController.php, services/api/app/Core/Models/**audit** | workspaces/{workspace}/audit-logs (+ export new) |
| P1-12 | Frontend enterprise UX debt | services/web/src/components/**, services/web/src/pages/**, docs/FRONTEND_ARCHITECTURE.md | cross-app UX |

## 3) P2 Strategic Backlog - Documented Gap Specs to Implement

All below map directly to docs/backend-gaps and should be treated as design specs:

- docs/backend-gaps/bg-01-voice-commands.md
- docs/backend-gaps/bg-02-meeting-conferencing.md
- docs/backend-gaps/bg-03-project-email.md
- docs/backend-gaps/bg-04-chat-system.md
- docs/backend-gaps/bg-05-knowledge-autocapture.md
- docs/backend-gaps/bg-06-offline-sync.md
- docs/backend-gaps/bg-07-sentiment-analysis.md
- docs/backend-gaps/bg-08-predictive-analytics.md
- docs/backend-gaps/bg-09-digital-twin.md
- docs/backend-gaps/bg-10-meeting-effectiveness-okr.md
- docs/backend-gaps/bg-11-automation-suggestions.md
- docs/backend-gaps/bg-12-team-capacity-backend.md
- docs/backend-gaps/bg-13-my-day-backend.md
- docs/backend-gaps/bg-14-plugin-system.md
- docs/backend-gaps/bg-15-field-level-permissions.md

## 4) Route-Level Gap Hotspots (from services/api/routes/api.php)

These route groups already exist and are where missing depth should be implemented, not recreated elsewhere:

1. Finance controls
- workspaces/{workspace}/finance/invoice-approvals
- workspaces/{workspace}/finance/invoices/{invoice}/submit-approval
- workspaces/{workspace}/finance/invoices/{invoice}/reverse

2. Report schedules and exceptions
- workspaces/{workspace}/reports/schedules
- workspaces/{workspace}/reports/schedules/{schedule}/run-now
- workspaces/{workspace}/reports/schedules/exceptions

3. Integration reliability
- workspaces/{workspace}/integrations/webhook-events
- workspaces/{workspace}/integrations/webhook-events/{event}/retry
- workspaces/{workspace}/integrations/webhook-events/{event}/replay-now

4. SCIM and field permissions
- workspaces/{workspace}/field-permissions
- workspaces/{workspace}/scim/tokens
- /api/scim/v2/Users
- /api/scim/v2/Groups
- /api/scim/v2/ServiceProviderConfig

5. Scenario and planning
- workspaces/{workspace}/scenarios
- workspaces/{workspace}/scenarios/{scenario}/simulate
- workspaces/{workspace}/scenarios/compare

6. Offline sync (present but needs maturity)
- workspaces/{workspace}/sync/conflicts
- workspaces/{workspace}/sync/conflicts/{conflict}
- workspaces/{workspace}/sync/conflicts/resolve-all

## 5) Test Expansion Map

## Security / control-plane
- Extend: services/api/tests/Feature/Security/ScimAndFieldPermissionsTest.php
- Extend: services/api/tests/Feature/Security/ReadinessControlPlaneTest.php
- Extend: services/api/tests/Feature/Security/RealWorldReadinessTest.php

## Scenario / planning
- Extend: services/api/tests/Unit/Scenario/ScenarioSimulationTest.php

## Reliability / audit automation
- Extend: services/tests/python/system_hardening_audit.py

## New suites to add
- services/api/tests/Feature/Finance/ImmutablePostingTest.php
- services/api/tests/Feature/Finance/CloseLockAndReversalTest.php
- services/api/tests/Feature/Reporting/DrilldownAndDefinitionsTest.php
- services/api/tests/Feature/Integrations/ConnectorReplayAndRetryTest.php
- services/api/tests/Feature/Permissions/ObjectAclCoverageTest.php
- services/api/tests/Feature/Automation/FailureRecoveryTest.php

## 6) Frontend Delivery Map for Missing Coverage

## Existing high-value files to extend now
- services/web/src/components/layout/CommandPalette.tsx
- services/web/src/pages/crm/CRMPage.tsx
- services/web/src/components/crm/DealDetailModal.tsx
- services/web/src/hooks/useItems.ts
- services/web/src/components/board/TableView.tsx
- services/web/src/pages/calendar/CalendarView.tsx

## Missing page families (likely new files)
- services/web/src/pages/invoicing/**
- services/web/src/pages/purchasing/**
- services/web/src/pages/sales/**
- services/web/src/pages/accounting/**
- services/web/src/pages/automation/**

## 7) Infra and Release Gate Map

- .github/workflows/ci.yml (gate all P0 evidence)
- infra/prometheus/prometheus.yml (SLO/alerts wiring)
- infra/alertmanager/** (delivery targets)
- docker-compose.yml and docker-compose.override.yml (local reproducibility)

## 8) Suggested Branching and Execution Order

1. branch/p0-runtime-verification
2. branch/p0-finance-controls
3. branch/p0-reporting-trust
4. branch/p0-automation-reliability
5. branch/p0-permission-coverage
6. branch/p0-core-connectors
7. branch/p0-sre-observability

After P0 merges and green evidence:
- branch/p1-template-governance
- branch/p1-collab-acl-workflows
- branch/p1-module-depth-wave

## 9) Definition of Done (enforced)

An item in this map is done only if:
1. Code changes merged in listed files.
2. Relevant route/group behavior verified.
3. Test file updated or added with passing assertions.
4. CI artifacts show green status for that item category.
