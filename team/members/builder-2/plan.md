---
member_id: "builder-2"
type: "builder"
ticket: "GAP-EXP-001"
owner: "Implementation — Feature Modules (CRM/ERP) Agent"
status: running
lock: true
priority: critical
review_required: true
reviews_by: ["reviewer"]
time_estimate: "5d"
time_spent: ""
context_files:
  - "services/web/src/lib/"
  - "services/web/src/pages/"
  - "services/api/app/Modules/"
  - "services/api/composer.json"
strict_scope: true
artifact_refs:
  - "services/web/src/"
  - "services/api/app/"
created_at: "2026-06-06T15:00:00Z"
updated_by: "Leader"
updated_at: "2026-06-06T15:00:00Z"
---

# Plan — builder-2 (GAP-EXP-001)

## Ticket Summary
Only 1 CSV export exists (ReportsPage). 0 Excel exports. 10+ list pages need export buttons. Pilot mine needs to export contacts, deals, leads, employees to Excel for offline analysis.

## Deliverables
- [ ] **Client-side**: Add `@sheetjs/xlsx` (or `xlsx` npm package) to services/web
- [ ] **Client-side**: Build shared `<ExportButton>` component supporting xlsx, csv, json formats
- [ ] **Client-side**: Wire `<ExportButton>` to 10+ list pages: deals, contacts, leads, hazards, permits, tickets, employees, board items, accounts, journal entries
- [ ] **Server-side**: Add `maatwebsite/excel` to services/api (composer.json)
- [ ] **Server-side**: Create or extend a generic export endpoint in API that returns xlsx
- [ ] **Server-side**: Wire per-list xlsx download endpoints for each page
- [ ] Verify `npm run build` and `vendor/bin/phpunit` pass

## Acceptance Criteria
- [ ] Every list page has an ExportButton in the toolbar/header
- [ ] Export produces valid .xlsx file (server-side) as primary format
- [ ] Export produces valid .csv file (fallback)
- [ ] Exported data matches the current list filters/sort
- [ ] `npm run build` passes
- [ ] Quality gates pass

## Quality Gates
- [ ] `npm run build` passes
- [ ] `node team/scripts/validate.mjs` passes

## Out of Scope
- @Mentions (GAP-MENTION-001 — separate task)
- Print (GAP-DOC-001 — separate task)
- Theme/logo (GAP-THEME-001 — separate task)

## Strict Scope
Read ONLY context_files plus your own 4 files.
