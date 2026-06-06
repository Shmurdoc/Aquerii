---
member_id: "qa-lead-integration"
type: "qa-lead"
ticket: "GAP-CRIT-007"
owner: "QA — Integration (k6 load, E2E, CI) Agent"
status: running
lock: true
priority: critical
review_required: true
reviews_by: ["reviewer"]
time_estimate: "2h"
time_spent: ""
context_files:
  - "services/web/tests/"
  - "docker-compose.yml"
  - ".github/workflows/"
  - "services/api/Dockerfile"
strict_scope: true
artifact_refs:
  - "services/web/tests/"
  - "docker-compose.yml"
created_at: "2026-06-06T13:00:00Z"
updated_by: "Leader"
updated_at: "2026-06-06T13:00:00Z"
---

# Plan — qa-lead-integration (GAP-CRIT-007)

## Ticket Summary
Phase 1 final gate: verify the full Playwright 96-test suite passes on a fresh build. This proves the image rebuild (GAP-CRIT-001) and all infrastructure changes (GAP-CRIT-006) work end-to-end without `docker cp` band-aids.

## Deliverables
- [ ] Verify Docker stack builds with `docker compose up -d --build` (or document why it can't run locally)
- [ ] Run `cd services/web && npx playwright test --config=playwright.config.ts`
- [ ] Report the results: pass/fail/flaky count
- [ ] If failures exist, document the failing tests, root cause, and whether they are pre-existing or new
- [ ] Update status.md with the final verdict

## Acceptance Criteria
- [ ] Docker build verified (or blocker documented)
- [ ] Playwright results documented
- [ ] Phase 1 exit gate status reported clearly

## Quality Gates
- [ ] `node team/scripts/validate.mjs` passes

## Out of Scope
- Fixing test failures (document them for a debugger)
- Application code changes

## Strict Scope
Test infrastructure only.
