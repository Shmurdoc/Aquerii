# Execution Roadmap to Done

Date: 2026-05-30

## Phase 0: Stabilize execution substrate (must pass first)

- Repair API dependency integrity and rerun targeted readiness tests.
- Fix realtime TypeScript environment and strict typing failures.
- Repair AI environment dependency parity and module contracts.
- Confirm Docker compose status and service health reporting.

Exit gate:
- Build/test matrix green or fully explained with bounded blockers.

## Phase 1: Collaboration completion

- Implement watchers for tasks.
- Implement comment reactions (thumbs-up and core set).
- Implement mention resolver with user/group aliases.
- Implement comment read-state and inbox fanout improvements.
- Add collaboration SLA and escalation policies.

Exit gate:
- end-to-end collaboration flow passes for solo, semi-group, group.

## Phase 2: Time/reminder completion

- Ship My Day control plane with overdue, waiting, follow-up, focus.
- Ship staged reminders and recurring work controls.
- Add escalation engine with policy and quiet hours.
- Add reminder observability dashboards.

Exit gate:
- reminder reliability tests and no duplicate send regressions.

## Phase 3: Template completion

- Ship invoice template pack.
- Ship quote/PO/receipt/support/report templates.
- Add template governance lifecycle and versioning.
- Add preview validation and fallback behavior.

Exit gate:
- all launch-critical workflows can be created from approved templates.

## Phase 4: Governance completion

- Ship delegated admin controls with expiry and scope.
- Add permission explainability endpoint.
- Add access review and drift reports.
- Enforce MFA for privileged roles.

Exit gate:
- role and delegation abuse scenarios blocked in tests.

## Phase 5: Reliability and operations closure

- SLO dashboards and alert routes validated.
- Chaos checks for retry/replay/idempotency.
- Incident runbooks and rollback drills completed.

Exit gate:
- production readiness review signed with evidence.

## Delivery operating rules

- Every item maps to owner, due date, and test evidence.
- No merge without linked acceptance criteria.
- No new feature work outside this roadmap until Phase 0-2 are closed.
