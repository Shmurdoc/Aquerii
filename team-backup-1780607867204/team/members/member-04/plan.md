---
member_id: member-04
owner: QA / Integration Agent
area: qa-integration
priority: low
estimated_hours: 4
created_at: 2026-06-04T04:00:00Z
updated_by: Leader
artifact_refs:
  - "team/GAPS.md (LOW-016, LOW-017, LOW-018, LOW-019, LOW-020, LOW-021, LOW-022, LOW-023)"
---

# Plan

- Objective: Phase 4 test gaps — write missing PHP Pest tests
- Deliverables:
  1. LOW-016: Write Pest test for WorkspaceInvitationController — test invite flow, accept, reject
  2. LOW-017: Write Pest test for BoardGroupController — test CRUD, reorder
  3. LOW-018: Write Pest test for BoardColumnController — test CRUD, reorder
  4. LOW-019: Write Pest test for CrmContactController — test CRUD, search
  5. LOW-020: Write Pest test for CrmCompanyController — test CRUD
  6. LOW-021: Write Pest test for CrmDealController — test CRUD, move, score
  7. LOW-022: Write Pest test for ProductController — test CRUD, stock
  8. LOW-023: Write Pest test for DocumentFolderController — test CRUD, tree
- Preconditions: All API implementations complete
- Acceptance Criteria:
  - [ ] All 8 test files written under services/api/tests/Feature/
  - [ ] Each test covers create, read, update, delete cycles
  - [ ] Pest test suite runs without errors (requires Docker for Postgres/Redis)
  - [ ] Test plan updated in services/tests/test-plan.md
