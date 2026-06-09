# P0 Focus Plan - Launch Blocker Closure Only

Date: 2026-05-29
Scope: P0 items only
Rule: No P1/P2 work until all P0 acceptance tests are green with evidence.

## P0 Mission

Close these blockers and prove they are closed:
1. Runtime verification suite reproducibility
2. Finance immutable posting + approvals + close semantics
3. Reporting trust (definitions, drill-down, reproducibility)
4. Automation reliability (idempotency, retry, replay, observability)
5. Permission coverage and leak prevention
6. Core connector hardening (Stripe, Google, Microsoft)
7. Accounting system-of-record baseline
8. SRE readiness (SLO dashboards, alerts, failure-mode tests)

## Hard Scope Guardrails

- If a task is not mapped to P0-01 through P0-08, it is out of scope.
- No new feature development except what is required to satisfy P0 acceptance.
- No design-system/UI polish work unless directly required to verify P0 behavior.
- Every merged PR must link to one P0 ID.

## Execution Order (critical path)

1. P0-01 Runtime verification
2. P0-05 Permission coverage (security floor)
3. P0-02 + P0-07 Finance + accounting integrity
4. P0-04 Automation reliability
5. P0-06 Connector hardening
6. P0-03 Reporting trust
7. P0-08 SRE observability/failure-mode enforcement

Reason for this order:
- You cannot trust any closure claims without reproducible tests.
- Security and finance controls must be validated before connector and reporting claims.
- SRE gate should be final to enforce all above in CI and monitoring.

## P0 Workboard

| ID | Deliverable | DRI | Target Evidence |
|---|---|---|---|
| P0-01 | Targeted readiness tests run green in local Docker and CI | QA + Backend | CI artifact + local command transcript |
| P0-05 | Permission contract coverage complete on high-risk endpoints | Security + Backend | Contract test report + endpoint matrix |
| P0-02 | Immutable posting and approval gates enforce correctly | Backend Finance | Feature tests + migration proof |
| P0-07 | Accounting baseline reconciles statements with ledger exports | Backend Finance + Data | Reconciliation test pack |
| P0-04 | Retry/replay/idempotency deterministic under injected failures | Backend + Infra | Failure-mode test results |
| P0-06 | Stripe/Google/Microsoft critical flows hardened + replay-safe | Backend Integrations | Connector conformance pack |
| P0-03 | KPI drill-down and metric definitions reproducible | Data + Backend + Frontend | Reproducibility report |
| P0-08 | SLO dashboards + alert routes + chaos checks active | Infra/SRE | Dashboard snapshots + alert test logs |

## Day-by-Day Plan (first 10 days)

## Day 1-2
- Stabilize runtime profile for services/api tests.
- Fix environment parity blockers (extensions, DB, compose path, seed reset).
- Freeze baseline failing tests and classify by P0 ID.

Exit:
- P0-01 baseline established, reproducible fail list recorded.

## Day 3-4
- Close P0-05 permission coverage on SCIM, field permissions, audit, finance routes.
- Add leak-prevention tests for owner/admin/member role boundaries.

Exit:
- Permission matrix tests green.

## Day 5-6
- Close finance immutability + approval + reversal semantics (P0-02).
- Implement accounting reconciliation baseline and close-lock behavior (P0-07).

Exit:
- Finance and accounting tests green and reconciled outputs verified.

## Day 7
- Harden automation retry/replay/idempotency and observability hooks (P0-04).

Exit:
- Failure-injection suite passes for automation pathways.

## Day 8
- Harden Stripe/Google/Microsoft connector critical paths with replay-safe behavior (P0-06).

Exit:
- Connector conformance tests green.

## Day 9
- Deliver reporting trust closure: metric definitions + KPI drill-down + reproducibility checks (P0-03).

Exit:
- Reproducible report contract passes.

## Day 10
- Wire SLO dashboards, alerts, and chaos checks into CI/nightly (P0-08).
- Run full P0 gate.

Exit:
- P0 gate green with evidence bundle.

## Evidence Bundle Required Per P0 Item

Each item must ship with:
1. PR link(s)
2. Tests added/updated
3. Passing CI run URL
4. Local reproducibility command + output snippet
5. Short rollback note
6. Residual risk note

## Mandatory Commands for P0 Gate (reference)

From services/api:
- composer dump-autoload -o
- php artisan test tests/Feature/Security/ScimAndFieldPermissionsTest.php tests/Feature/Security/ReadinessControlPlaneTest.php tests/Feature/Security/RealWorldReadinessTest.php tests/Unit/Scenario/ScenarioSimulationTest.php

From repo root (after infra update):
- docker compose up -d
- run chaos/failure-mode checks for retry/replay paths
- run system hardening audit script

## Red Flags That Mean P0 Is Not Done

- Any "works on my machine" discrepancy between local and CI test results.
- Any finance mutation that can alter posted history without explicit reversal path.
- Any high-risk endpoint missing role/permission contract tests.
- Any connector path without retry/replay audit trail.
- Any report KPI that cannot drill down to source records.
- Any alert route that is configured but unverified.

## Stop-Doing List Until P0 Is Closed

- New module pages
- P2 AI/platform bets (plugin marketplace, digital twin, sentiment)
- Non-critical UX refinements
- Broad refactors unrelated to P0 acceptance

## P0 Exit Statement Template

"P0 is closed when all P0 IDs are green, evidence bundle is complete, and there are no unresolved launch blockers in security, finance, reporting, automation reliability, integrations, or SRE posture."
