# DESIGN: PrintButton + `@media print` — GAP-DOC-001

## Decision Record

### 1. PrintButton Component
- Create `PrintButton` as a thin wrapper around `<Button>` with `Printer` icon from `lucide-react`
- Uses `window.print()` on click
- **Variant**: `secondary`, **Size**: `sm` (toolbar) / `xs` (footer)
- Props: all Button props + optional `label` (default: "Print")

### 2. PrintButton Placement
Two placement patterns based on page type:

#### A. List/Table Pages (80% of entity pages)
Place next to the search bar / "New" button in the toolbar header area:
```
[h1 Title]  [Status filters...]  [flex-1]  [Search]  [PrintButton]  [New Button]
```
All entity pages matching this pattern:
1. InvoicingPage — toolbar, right of search
2. PurchasingPage — toolbar, right of search
3. SalesPage — toolbar, right of search
4. ContactsPage — toolbar, right of search
5. LeadsPage — toolbar, right of search
6. QuotesPage — header, right of "New Quote"
7. DealApprovalsPage — header, right of title
8. ProductsPage — toolbar, right of search
9. FinancialApprovalsPage — header
10. ReportSchedulesPage — header
11. GoalsPage — header
12. MeetingOutcomesPage — header
13. EmailAddressesPage — header
14. EmployeeGroupsPage — header
15. AuditLogsPage — header
16. WebhookEventsPage — header
17. FieldPermissionsPage — header
18. CRMPage — header
19. AutomationRulesPage — header
20. ApprovalRulesPage — header

#### B. Drawer/Detail Side Panels (InvoiceDrawer, PurchaseOrderDrawer, etc.)
Place in the drawer footer, left side (before action buttons):
```
[PrintButton]  [PDF Download]  [Record Payment]
```
Detail drawer pages:
21. InvoiceDrawer — footer
22. PurchaseOrderDrawer — footer
23. SalesOrderDrawer — footer
24. ContactDrawer — header
25. EmployeesPage (Directory tab, etc.) — header

#### C. Special tabbed pages
26. BoardPage — header
27. DocumentPage — header
28. SupportTicketPage — header
29. HSSEPage (Incidents, Hazards, Actions) — header
30. MarketingCampaignsPage — header

### 3. `@media print` Stylesheet
Add to `index.css` after the existing `@media (prefers-reduced-motion)` block.

**Hide these elements on print:**
- `nav`, `aside`, `header`, `footer`
- `.NavRail`, `[aria-label="Main navigation"]`
- `.TopBar`, `[aria-label="Search"]`
- `button`, `[role="button"]` — except `.print-button`
- `input`, `select`, `textarea`
- `.modal`, `[role="dialog"]`, `.drawer`
- `#CommandPalette`, `#NotificationCenter`
- `.ConflictResolver`, `.SyncStatus`
- `::-webkit-scrollbar`

**Show these with print-specific styling:**
- `main` content area — full width, no overflow
- Text: black on white, serif-friendly stack
- Page margins: 0.75in top/bottom, 0.75in left/right

**Add branded header:**
- `@page` margin-top for header
- Pseudo-element on `body::before` showing "Aquerii" + page URL
- Or use a `.print-header` utility

### 4. Branded Layout
- **Header**: `.print-header` with company name "Aquerii" rendered at print time only
- **Footer**: `.print-footer` with page URL and print date
- **Logo**: Use `.print-logo` class that shows the workspace logo or default "Aquerii" text

### 5. Coordination with builder-3
builder-3 handles: .xlsx export UI, PDF logo URL in dashboard settings, PDF download wiring.
Designer provides: PrintButton component + CSS, entity page list, placement guidance.

## Implementation Plan

### Phase 1 — Create PrintButton component
File: `services/web/src/components/ui/PrintButton.tsx`
- Wraps `Button` with `Printer` icon
- Calls `window.print()`
- Export from `services/web/src/components/ui/index.ts`
- `.print-button` CSS class to ensure it remains visible in print mode

### Phase 2 — Add `@media print` CSS
File: `services/web/src/index.css`
- Append after line 456 (before EOF)
- Hide nav, sidebar, topbar, context panel, action buttons
- Show content with proper typography and margins
- Add branded print header/footer

### Phase 3 — builder-3 integration
- Provide the entity page list (above)
- builder-3 adds PrintButton to each page's toolbar/drawer

## Visual Mockup (ASCII)

```
┌──────────────────────────────────────────────────────┐
│ [← Back]  Invoices                    [Search] [🖨] [+] │  ← toolbar with PrintButton
├──────────────────────────────────────────────────────┤
│  Stats cards...                                       │
├──────────────────────────────────────────────────────┤
│  ┌────────────┬──────────┬────────┬────────┬──────┐  │
│  │ Invoice #  │ Customer │ Status │ Date   │ Total│  │
│  ├────────────┼──────────┼────────┼────────┼──────┤  │
│  │ INV-001   │ Acme     │ Paid   │ 06/01  │ $100 │  │
│  │ ...        │ ...      │ ...    │ ...    │ ...  │  │
│  └────────────┴──────────┴────────┴────────┴──────┘  │
└──────────────────────────────────────────────────────┘

Print preview:
┌──────────────────────────────────────────────────────┐
│  Aquerii                                              │
│  Invoices — Printed 2026-06-05                        │
│──────────────────────────────────────────────────────│
│                                                        │
│  INV-001   Acme Corp          Paid   06/01/2026  $100 │
│  INV-002   Beta Ltd           Sent   05/28/2026  $250 │
│  ...                                                   │
│                                                        │
│──────────────────────────────────────────────────────│
│  Aquerii · https://app.aquerii.com/invoicing           │
└──────────────────────────────────────────────────────┘
```

## File Changes

### New files:
1. `services/web/src/components/ui/PrintButton.tsx` — PrintButton wrapper
2. `services/web/src/components/ui/print.css` — Print stylesheet (imported by index.css)

### Modified files:
1. `services/web/src/components/ui/index.ts` — Export PrintButton
2. `services/web/src/index.css` — Import print.css

### Files for builder-3 to modify:
1. `services/web/src/pages/invoicing/InvoicingPage.tsx`
2. `services/web/src/pages/purchasing/PurchasingPage.tsx`
3. `services/web/src/pages/sales/SalesPage.tsx`
4. `services/web/src/pages/crm/ContactsPage.tsx`
5. `services/web/src/pages/crm/LeadsPage.tsx`
6. `services/web/src/pages/crm/QuotesPage.tsx`
7. `services/web/src/components/erp/InvoiceDrawer.tsx`
8. `services/web/src/components/erp/PurchaseOrderDrawer.tsx`
9. `services/web/src/components/erp/SalesOrderDrawer.tsx`
10. `services/web/src/components/crm/ContactDrawer.tsx`
