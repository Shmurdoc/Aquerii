# Reliability and Quality Gates

Date: 2026-05-30

## No-fake-guarantee policy

You asked for a 100 percent bulletproof guarantee.
Direct answer: no engineer can honestly guarantee that before passing evidence.
What we can guarantee is a strict gate system that blocks unsafe release.

## Release gates

Gate 1: Build integrity
- API, web, realtime, AI build/test jobs pass.

Gate 2: Security integrity
- authz tests for high-risk endpoints
- no critical vulnerabilities open

Gate 3: Data integrity
- finance posting immutability checks pass
- audit trail continuity checks pass

Gate 4: Collaboration integrity
- comments, mentions, reactions, watchers, notifications pass e2e tests

Gate 5: Time/reminder integrity
- reminder dedupe and escalation tests pass

Gate 6: Template integrity
- rendering and variable validation pass for all default templates

Gate 7: Operations integrity
- SLO dashboards healthy
- alert drills successful
- rollback drills successful

## Required test packs

- Contract tests for roles and permissions.
- End-to-end task collaboration tests.
- Reminder and escalation timing tests.
- Integration reliability tests (retry, replay, idempotency).
- Reporting drill-down correctness tests.

## Reliability SLO targets

- API p95 latency by endpoint class.
- Realtime message delivery success rate.
- Reminder delivery within SLA window.
- Background job retry success within bounded attempts.
- Alert detection and acknowledgment times.

## Stop-ship triggers

- Any unresolved P0 blocker in Gaps.
- Any authz bypass on owner/admin routes.
- Any mutable posted financial record path.
- Any critical data-loss path without recovery.

## Required evidence bundle per release

- CI run links
- local repro commands + output summary
- migration and rollback notes
- risk list and mitigation status
- incident simulation results
