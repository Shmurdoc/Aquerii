---
member_id: member-01
owner: Core API Agent
area: core-api-integration
priority: medium
estimated_hours: 4
created_at: 2026-06-04T04:00:00Z
updated_by: Leader
review_required: false
artifact_refs:
  - "team/GAPS.md (MED-004, MED-005, LOW-002, LOW-012)"
---

# Plan

- Objective: Phase 4 backend cleanup
- Deliverables:
  1. MED-004: Create Laravel migration for realtime_events.sequence trigger (read infra/postgres/init/02_triggers.sql, wrap in migration)
  2. MED-005: Delete empty file services/api/app/Http/Controllers/Api/CRM/CRMControllers.php
  3. LOW-002: Add workspace delete endpoint (DELETE /workspaces/{workspace}) + soft delete
  4. LOW-012: Fix ClickHouse empty password in root .env.example (set a placeholder password)
  5. Run vendor/bin/phpstan analyse level 5
- Preconditions: None
- Acceptance Criteria:
  - [ ] Migration creates the DB trigger correctly
  - [ ] Empty CRMControllers.php deleted
  - [ ] DELETE /workspaces/{id} returns 200 and soft-deletes
  - [ ] .env.example has non-empty ClickHouse password
  - [ ] phpstan level 5 passes
