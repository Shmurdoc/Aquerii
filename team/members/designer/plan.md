---
member_id: "designer"
type: "designer"
ticket: "GAP-DOC-001"
owner: "UX and product-design decisions Agent"
status: running
lock: true
priority: critical
review_required: false
reviews_by: []
time_estimate: "4d"
time_spent: ""
context_files:
  - "services/web/src/"
  - "services/api/resources/views/"
strict_scope: false
artifact_refs:
  - "services/web/src/"
created_at: "2026-06-06T15:00:00Z"
updated_by: "Leader"
updated_at: "2026-06-06T15:00:00Z"
---

# Plan — designer (GAP-DOC-001)

YOU ARE WORKING WITH builder-3. builder-3 HANDLES BACKEND. YOU HANDLE UI/UX.

## Ticket Summary
30 entity pages have no Print button. No `@media print` stylesheet. PDFs show no logo. Invoice PDF download not wired.

## Your Deliverables
- [ ] **PrintButton design**: Propose a PrintButton component placement on entity pages. Use existing Button component.
- [ ] **@media print stylesheet**: Write `@media print` CSS rules that hide navigation, sidebar, action buttons on print. Show full content with proper margins.
- [ ] **Print layout**: Ensure entity pages look good when printed (proper spacing, readable text, branded header/footer).
- [ ] Coordinate with builder-3 on: which pages get PrintButton, .xlsx export UI, PDF logo placement.

## Acceptance Criteria
- [ ] Print preview shows clean layout without nav/sidebar/buttons
- [ ] Print layout includes company name
- [ ] Consistent with existing design system

## Quality Gates
- [ ] Visual consistency with existing pages
- [ ] No regressions in interactive view

## Strict Scope
You may read any files needed for design decisions.
