# P0 Issues Ready To Import

Date: 2026-05-29
Use these issue bodies directly in your tracker.

## [P0-01] Stabilize Runtime Verification Profile

### Why This Is P0
- Launch blocker category: Runtime reproducibility.
- Risk: No readiness claim is credible while local/CI outcomes diverge.
- Out of scope: Feature additions unrelated to test reproducibility.

### Acceptance Criteria
- [ ] Targeted readiness suite runs in Docker and CI with equivalent outcomes.
- [ ] Required environment contracts are documented and validated (DB, extensions, services).
- [ ] Baseline command set is stable and repeatable by another engineer.

### Tasks
- [ ] Normalize compose and service dependencies for test execution.
- [ ] Validate required PHP extensions and DB connectivity.
- [ ] Produce and commit a deterministic test run command set.

### Evidence
- [ ] CI run URL with targeted readiness suite.
- [ ] Local terminal transcript.
- [ ] Known-failure list mapped to P0 IDs.

## [P0-05] Enforce Permission Contract Coverage

### Why This Is P0
- Launch blocker category: Security and data isolation.
- Risk: Unauthorized data/operation access across workspaces/roles.
- Out of scope: New role model redesign.

### Acceptance Criteria
- [ ] High-risk endpoints have role/permission contract tests.
- [ ] Owner/admin/member boundary tests pass.
- [ ] No endpoint in scope is missing explicit permission assertions.

### Tasks
- [ ] Expand endpoint matrix for SCIM, field permissions, audit, finance control plane.
- [ ] Add negative tests for privilege escalation and data leakage.
- [ ] Add matrix output artifact in CI.

### Evidence
- [ ] Contract test report.
- [ ] Endpoint matrix file linked in PR.
- [ ] CI pass proof.

## [P0-02] Lock Finance Posting and Approval Semantics

### Why This Is P0
- Launch blocker category: Financial integrity.
- Risk: Posted financial history can be mutated without reversible trail.
- Out of scope: New invoice product capabilities.

### Acceptance Criteria
- [ ] Posted invoices cannot be mutated/deleted directly.
- [ ] Approval lifecycle is enforced for controlled states.
- [ ] Reversal path is explicit, auditable, and tested.

### Tasks
- [ ] Validate and harden state transitions.
- [ ] Add mutation guard tests and reversal tests.
- [ ] Confirm migration/index support for lock fields.

### Evidence
- [ ] Feature test outputs.
- [ ] Migration/schema proof.
- [ ] Audit trail examples.

## [P0-07] Establish Accounting System-of-Record Baseline

### Why This Is P0
- Launch blocker category: Accounting trust.
- Risk: Inability to reconcile ledgers/statements before launch.
- Out of scope: Advanced forecasting features.

### Acceptance Criteria
- [ ] Ledger exports reconcile against accounting statements for baseline scenarios.
- [ ] Close-lock semantics prevent back-dated mutation without controlled process.
- [ ] Reconciliation tests are automated.

### Tasks
- [ ] Define reconciliation fixtures and expected outputs.
- [ ] Implement close-lock checks in relevant paths.
- [ ] Add deterministic reconciliation tests.

### Evidence
- [ ] Reconciliation test pack.
- [ ] Diff outputs showing match/mismatch handling.
- [ ] CI artifact links.

## [P0-04] Make Automation Retry/Replay/Idempotency Deterministic

### Why This Is P0
- Launch blocker category: Automation reliability.
- Risk: Duplicate side effects, silent drops, non-deterministic retries.
- Out of scope: New automation UI functionality.

### Acceptance Criteria
- [ ] Retries are bounded and auditable.
- [ ] Replay is idempotent and deterministic.
- [ ] Failure-injection scenarios pass with expected states.

### Tasks
- [ ] Add failure-mode tests for timeout, network error, duplicate delivery.
- [ ] Harden idempotency keys and state transitions.
- [ ] Expose operational metadata for retries/replay.

### Evidence
- [ ] Failure-injection results.
- [ ] Event ledger snapshots.
- [ ] CI pass links.

## [P0-06] Harden Core Connectors (Stripe, Google, Microsoft)

### Why This Is P0
- Launch blocker category: Integration reliability.
- Risk: Connector drift/outage can cause inconsistent business state.
- Out of scope: Additional connector roadmap items.

### Acceptance Criteria
- [ ] Critical flows are covered by conformance tests.
- [ ] Replay/retry behavior is safe and traceable.
- [ ] Auth/token refresh edge-cases are validated.

### Tasks
- [ ] Add connector conformance tests for critical flows.
- [ ] Validate retry/replay behavior under transient failures.
- [ ] Verify webhook/event ingestion idempotency.

### Evidence
- [ ] Conformance test report.
- [ ] Connector-specific failure logs.
- [ ] CI pass links.

## [P0-03] Guarantee Reporting Trust and Drill-Down Reproducibility

### Why This Is P0
- Launch blocker category: Reporting correctness.
- Risk: KPI values not reproducible to source records.
- Out of scope: New dashboard visual redesign.

### Acceptance Criteria
- [ ] KPI definitions are versioned and linked to source query logic.
- [ ] Every critical KPI supports drill-down to record-level evidence.
- [ ] Reproducibility tests pass using frozen fixtures.

### Tasks
- [ ] Create definition registry for launch-critical KPIs.
- [ ] Add drill-down contract tests.
- [ ] Add reproducibility suite in CI.

### Evidence
- [ ] KPI definition map.
- [ ] Reproducibility report.
- [ ] CI links.

## [P0-08] Enforce SRE Launch Gate (SLO/Alerts/Failure-Mode)

### Why This Is P0
- Launch blocker category: Operational readiness.
- Risk: Outages/regressions not detected or not actionable.
- Out of scope: Non-critical observability enhancements.

### Acceptance Criteria
- [ ] Launch-critical SLO dashboards exist and are populated.
- [ ] Alert routes are tested end-to-end.
- [ ] Failure-mode checks are automated in CI/nightly.

### Tasks
- [ ] Finalize and validate SLO dashboard panels.
- [ ] Run alert delivery drills and document response.
- [ ] Add chaos/failure-mode gate to automation.

### Evidence
- [ ] Dashboard snapshots.
- [ ] Alert test logs.
- [ ] Nightly/CI job references.
