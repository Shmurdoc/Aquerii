---
member_id: "debugger-2"
type: "debugger"
ticket: "TKT-API-002"
owner: "Root-cause analysis #2 Agent"
status: running
lock: true
priority: high
review_required: false
time_estimate: "3h"
time_spent: ""
context_files:
  - "services/api/routes/api.php"
  - "services/api/routes/modules/meetings.php"
strict_scope: false
artifact_refs: []
created_at: "2026-06-04T21:17:47.595Z"
updated_by: "Leader"
updated_at: "2026-06-06T00:00:00Z"
---

# Plan — debugger-2 (TKT-API-002)

## Ticket Summary
Some API endpoints return Laravel paginators (`{ data: [...], current_page, last_page, total, ... }`), others return flat arrays. The frontend `DataTable` defensive coercion handles both, but this masks an underlying API design inconsistency. We need a full audit.

## Deliverables
- [ ] Sweep all API controller methods listed in `services/api/routes/*.php` and `services/api/routes/modules/*.php`
- [ ] For each endpoint, identify the response shape:
  - Paginated (`paginate()` / `Paginator`) — wraps in `{ data, current_page, last_page, total }`
  - Flat array (raw `->get()`, `->all()`)
  - Custom object
- [ ] Identify which endpoints are consumed by `DataTable` frontend components (look for patterns like `fetch(...)` with pagination params)
- [ ] Return a structured list of (endpoint, current shape, recommended shape) tuples
- [ ] Do NOT modify any callers or backend code — this is audit-only
- [ ] Report findings to GAPS.md as follow-up tickets

## Preconditions
- The `DataTable` component at `services/web/src/components/ui/DataTable.tsx` already has defensive coercion for both shapes
- This audit drives a follow-up wave to standardize all endpoints to return paginators where paginated, flat arrays otherwise

## Acceptance Criteria
- [ ] All API routes are inventoried
- [ ] Each endpoint has documented response shape
- [ ] Pattern violations are flagged (paginator mixed with flat array in same response, inconsistent naming)
- [ ] Deliverable is a list of (endpoint, current shape, recommended shape, DataTable consumer Y/N)
- [ ] `team/scripts/validate.mjs` exits 0 after plan/status updates

## Quality Gates
- [ ] audit complete — no code changes made
- [ ] `validate.mjs` passes

## Out of Scope (do NOT touch)
- Any code modification — this is audit-only
- Frontend code (DataTable, KpiRow, etc.)
- Database queries or schema changes
- Backend service changes

## Context Files
Read broadly: all API routes files. You may read any controller to verify response shapes. Do NOT modify them.

## Strict Scope
`strict_scope: false` — you need broad read access to audit all endpoints. Request expansion if needed.

## Completed Tasks
(none)
