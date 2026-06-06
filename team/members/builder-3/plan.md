---
member_id: "builder-3"
type: "builder"
ticket: "GAP-DOC-001"
owner: "Implementation — Feature Modules (Billing/Inventory) Agent"
status: running
lock: true
priority: critical
review_required: true
reviews_by: ["reviewer"]
time_estimate: "4d"
time_spent: ""
context_files:
  - "services/web/src/"
  - "services/api/app/Core/Http/Controllers/Api/DocumentPdfController.php"
  - "services/api/app/Core/Http/Controllers/Api/InvoicePdfController.php"
  - "services/api/app/Core/Http/Controllers/Api/BrandingController.php"
  - "services/api/app/Core/Services/PdfService.php"
  - "services/api/resources/views/"
strict_scope: true
artifact_refs:
  - "services/web/src/"
  - "services/api/app/"
  - "services/api/resources/"
created_at: "2026-06-06T15:00:00Z"
updated_by: "Leader"
updated_at: "2026-06-06T15:00:00Z"
---

# Plan — builder-3 (GAP-DOC-001)

YOU ARE WORKING WITH THE DESIGNER. THE DESIGNER HANDLES ALL UI/UX STYLES AND LAYOUT. YOU HANDLE THE BACKEND LOGIC AND WIRING.

## Ticket Summary
30 entity pages have no Print button, no `@media print` CSS, PDF logo not passed to Blade views, invoice PDF download not wired to UI.

## Deliverables
- [ ] **PrintButton**: Build a shared `<PrintButton>` component that calls `window.print()`
- [ ] **@media print stylesheet**: Add print-specific CSS (hide nav, sidebar, buttons; show full content; page margins)
- [ ] **Wire PrintButton to top entities**: CRM deal, board, contact, employee, document, hazard, permit, ticket, invoice, account (10 pages)
- [ ] **PDF logo fix**: Read `BrandingController` to get `workspace->logo_url`. Pass it to Blade PDF views. Verify it renders on PDF output.
- [ ] **Invoice PDF download**: Wire `InvoicePdfController` route to the existing invoice download button in `InvoicingPage` (check `lib/erp.ts` for the endpoint)
- [ ] Verify `npm run build` passes

## Acceptance Criteria
- [ ] `<PrintButton>` renders on 10+ entity pages
- [ ] `window.print()` in browser shows clean print layout (no nav, no buttons, readable content)
- [ ] PDF download from invoice page actually triggers download
- [ ] PDF output includes workspace logo
- [ ] `npm run build` passes

## Quality Gates
- [ ] `npm run build` passes
- [ ] `node team/scripts/validate.mjs` passes

## Out of Scope
- Export (GAP-EXP-001 — separate task)
- @Mentions (GAP-MENTION-001 — separate task)
- Theme (GAP-THEME-001 — separate task)
- Logo upload UI (handled by builder-1 in GAP-THEME-001)

## Strict Scope
Read ONLY context_files plus your own 4 files.
