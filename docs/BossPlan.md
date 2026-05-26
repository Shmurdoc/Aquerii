# BossPlan — Aquerii Complete Implementation Master Document

> **Last updated:** 2026-05-24  
> **Status:** Active — see `docs/PRODUCTION_READINESS_PLAN.md` for urgent ship-blocking items  
> **Covers:** Bug fixes, missing UI surfaces, floating API elimination, phased rollout  
> **Session update (2026-05-24):** 38 backend routes now registered for Accounting, Automation, Invoicing, Inventory, Purchasing, Sales. All floating API gaps are **backend-complete** — only frontend UI work remains (see Phase 4). Authz, SQL injection, CORS, CSP, Docker security hardening also resolved.

---

## 1. Confirmed Bugs

These are real defects with root causes identified. Fix these before any new feature work.

| # | Bug | Root Cause | Fix Location |
|---|-----|-----------|-------------|
| B1 | `done` column missing on items | No `done` column in `items` migration | New migration: `$table->boolean('done')->default(false)` |
| B2 | Item description saves as JSONB but reads as plain string | `ItemController` stores raw string; Tiptap expects JSON node tree | Normalize on read in `useItems.ts` |
| B3 | Comment author shows UUID, not name | `CommentController::index` doesn't join `users` table | Add `->with('user')` in query; include `user.name` in `CommentResource` |
| B4 | Paperless thumbnail 404 | `lib/paperless.ts` thumbnail route doesn't match Paperless-ngx `/api/documents/{id}/thumb/` | Fix URL pattern in `lib/paperless.ts` |
| B5 | Tag IDs shown instead of tag names in `PaperlessFileDrawer` | `tags` field returns array of IDs; tags not resolved | Fetch tag list and map IDs to names in `PaperlessFileDrawer.tsx` |
| B6 | Calendar "+N more" expands nothing | Click handler not wired in `CalendarView.tsx` | Add expand state + popover in `CalendarView.tsx` |

---

## 2. Known Technical Debt (Non-Bug)

| # | Issue | Location |
|---|-------|----------|
| T1 | Notification socket push never reaches UI | `useNotifications.ts` — `addNotification` never called from socket; only 30s poll works |
| T2 | `expected_version` never sent from frontend | `useItems.ts` — optimistic locking exists on backend but unused |
| T3 | CRM hardcodes `pipelines[0]` | `CRMPage.tsx` — multi-pipeline selector missing |
| T4 | No ARIA labels anywhere | All page/component files |
| T5 | No virtual scrolling on boards with 200+ items | `BoardPage.tsx` / `KanbanView.tsx` |

---

## 3. Floating API Inventory

> **Updated 2026-05-24:** All backend routes now **registered** in `routes/api.php` — 38 new routes added across 6 modules. The gap is now purely frontend UI (no pages, hooks, or components consuming these endpoints). See Phase 4 below for the UI implementation plan.

### 3.1 Fully Floating Modules (Backend Complete, Frontend Missing)

| Module | Endpoints | Controller File |
|--------|-----------|----------------|
| Accounting | GET/POST `/accounts`, GET/POST `/journal-entries` | `AccountController`, `JournalEntryController` |
| Automation | GET/POST/PATCH/DELETE `/automations`, GET `/automation-templates`, GET `/automations/{id}/runs` | `AutomationController` |
| Inventory | Full CRUD on `/products`, `/inventory-categories`, `/stock-items` | `ProductController`, `InventoryCategoryController`, `StockItemController` |
| Invoicing | Full CRUD on `/invoices` | `InvoiceController` |
| Purchasing | Full CRUD on `/purchase-orders` | `PurchaseOrderController` |
| Sales | Full CRUD on `/sales-orders` | `SalesOrderController` |

### 3.2 Partially Wired Modules

**CRM** — consumed: `pipelines.index`, `deals` CRUD (partial), `activities` CRUD (partial)

Uncovered endpoints:
- `PipelineController`: `store`, `show`, `update`, `destroy`
- `StageController`: all methods (`index`, `store`, `update`, `destroy`, `reorder`)
- `DealController`: `update`, `destroy`, `move`, `score`
- `ContactController`: all methods — no contacts UI exists
- `CompanyController`: all methods — no companies UI exists
- `CrmActivityController`: `update` only

**Documents** — consumed: `documents.index`, `documents.store`, `ydoc show/update`

Uncovered endpoints:
- `DocumentController`: `show` (workspace-prefixed path mismatch), `update`, `destroy`
- `ScannedDocumentController`: all 5 methods (frontend uses Paperless-ngx proxy instead)

---

## 4. Production Mail Provider

**BillionMail** ([https://www.billionmail.com/](https://www.billionmail.com/)) is the production transactional email provider for Aquerii.

| Environment | Provider | Host | Port |
|-------------|----------|------|------|
| Development | Mailpit (local catcher) | `mailpit` (Docker service) | `1025` |
| Production | BillionMail | `smtp.billionmail.com` | `587` |

Environment variables for production (`.env`):
```
MAIL_MAILER=smtp
MAIL_HOST=smtp.billionmail.com
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=your_billionmail_api_key
MAIL_PASSWORD=your_billionmail_api_key
MAIL_FROM_ADDRESS=noreply@aquerii.app
MAIL_FROM_NAME="${APP_NAME}"
```

---

## 5. Implementation Phases

### Phase 0 — Bug Fixes (1–2 days)

No new files except one migration. All other changes are edits to existing files.

| Task | File | Change |
|------|------|--------|
| B1: Add `done` column | `services/api/database/migrations/XXXX_add_done_to_items_table.php` (NEW) | `$table->boolean('done')->default(false)` |
| B1: Expose `done` in resource | `services/api/app/Core/Http/Resources/ItemResource.php` | Add `'done' => $this->done` |
| B2: Normalize description on read | `services/web/src/hooks/useItems.ts` | Wrap plain string in Tiptap doc node on read |
| B3: Join user on comment | `services/api/app/Core/Http/Controllers/CommentController.php` | Add `->with('user')` |
| B3: Return author name | `services/api/app/Core/Http/Resources/CommentResource.php` | Add `'author_name' => $this->user?->name` |
| B4: Fix thumbnail URL | `services/web/src/lib/paperless.ts` | Update thumbnail path to `/api/documents/{id}/thumb/` |
| B5: Resolve tag names | `services/web/src/components/documents/PaperlessFileDrawer.tsx` | Fetch `/api/tags/` on mount; map IDs to names |
| B6: Wire calendar expand | `services/web/src/components/board/CalendarView.tsx` | Add `expandedDay` state; render popover with all items on click |

**Acceptance criteria:** All 6 bugs pass manual verification. No regressions on boards, CRM, or documents.

---

### Phase 1 — Shell Redesign (2–3 days)

Replace the flat sidebar with a two-panel nav. Prerequisite for all module pages.

| Task | File | Change |
|------|------|--------|
| Create NavRail | `services/web/src/components/layout/NavRail.tsx` (NEW) | 48px icon rail; active module highlight |
| Create ContextPanel | `services/web/src/components/layout/ContextPanel.tsx` (NEW) | 200px collapsible panel; module-specific sub-nav |
| Replace Sidebar | `services/web/src/components/layout/Sidebar.tsx` | Gut and replace with Rail + ContextPanel wiring |
| Update AppLayout | `services/web/src/layouts/AppLayout.tsx` | Render `<NavRail>` + `<ContextPanel>` + `<Outlet>` |
| Upgrade CommandPalette | `services/web/src/components/layout/CommandPalette.tsx` | Add create actions + global search + keyboard navigation |
| Add Inbox page | `services/web/src/pages/inbox/InboxPage.tsx` (NEW) | Full notifications list; mark read/unread |
| Register /inbox route | `services/web/src/App.tsx` | Add `<Route path="/inbox" element={<InboxPage />} />` |
| Wire socket push | `services/web/src/hooks/useNotifications.ts` | Call `notificationStore.addNotification` on socket `notification` event |
| TopBar bell → inbox | `services/web/src/components/layout/TopBar.tsx` | Navigate to `/inbox` on bell click |

**Acceptance criteria:** Two-panel nav renders; command palette can create items; notifications arrive via socket without 30s delay.

---

### Phase 2 — CRM Completion (2–3 days)

Wire all uncovered CRM endpoints.

| Task | File | Change |
|------|------|--------|
| Pipeline CRUD | `services/web/src/pages/crm/CRMPage.tsx` | Create/rename/delete pipeline; remove `pipelines[0]` hardcode |
| Stage management | `services/web/src/components/crm/StageManager.tsx` (NEW) | Create/rename/delete/reorder stages |
| Deal update/delete | `services/web/src/components/crm/DealDetailModal.tsx` | Wire PATCH + DELETE; type `deal` prop properly |
| Deal move | `services/web/src/components/crm/DealCard.tsx` | PATCH `/crm/deals/{id}/move` on drag |
| Deal score | `services/web/src/components/crm/DealDetailModal.tsx` | Score input; POST `/crm/deals/{id}/score` |
| Contacts page | `services/web/src/pages/crm/ContactsPage.tsx` (NEW) | Full CRUD table for contacts |
| Companies page | `services/web/src/pages/crm/CompaniesPage.tsx` (NEW) | Full CRUD table for companies |
| CRM sub-routes | `services/web/src/App.tsx` | Add `/crm/contacts`, `/crm/companies` |
| CRM hook | `services/web/src/hooks/useCRM.ts` (NEW) | All CRM API calls consolidated |
| Activity update | `services/web/src/components/crm/DealDetailModal.tsx` | Wire PATCH on activity edit |

**Acceptance criteria:** All 33 CRM endpoints have at least one UI action that calls them.

---

### Phase 3 — Documents Completion (1 day)

| Task | File | Change |
|------|------|--------|
| Document update | `services/web/src/hooks/useDocuments.ts` | Add `updateDocument(id, patch)` → PATCH `/documents/{id}` |
| Document delete | `services/web/src/hooks/useDocuments.ts` | Add `deleteDocument(id)` → DELETE `/documents/{id}` |
| Detail page actions | `services/web/src/pages/documents/DocumentPage.tsx` | Rename/delete buttons wired |
| Scanned docs page | `services/web/src/pages/documents/ScannedDocumentsPage.tsx` (NEW) | List/upload/delete via native API |
| Register route | `services/web/src/App.tsx` | Add `/scanned-documents` |

**Acceptance criteria:** Documents can be renamed and deleted; scanned documents page is functional.

---

### Phase 4 — ERP Modules (5–7 days)

Each sub-phase follows the same pattern: hook → page → modal → route.

#### 4a — Invoicing (1 day)

| Task | File | Change |
|------|------|--------|
| Hook | `services/web/src/hooks/useInvoicing.ts` (NEW) | CRUD → `/invoices` |
| List page | `services/web/src/pages/invoicing/InvoicesPage.tsx` (NEW) | Table with status badges; create button |
| Modal | `services/web/src/components/invoicing/InvoiceModal.tsx` (NEW) | Form: client, line items, amounts, due date |
| Route | `services/web/src/App.tsx` | Add `/invoicing` |

#### 4b — Purchasing (1 day)

| Task | File | Change |
|------|------|--------|
| Hook | `services/web/src/hooks/usePurchasing.ts` (NEW) | CRUD → `/purchase-orders` |
| List page | `services/web/src/pages/purchasing/PurchaseOrdersPage.tsx` (NEW) | Table; create button |
| Modal | `services/web/src/components/purchasing/PurchaseOrderModal.tsx` (NEW) | Form: vendor, line items, dates |
| Route | `services/web/src/App.tsx` | Add `/purchasing` |

#### 4c — Sales (1 day)

| Task | File | Change |
|------|------|--------|
| Hook | `services/web/src/hooks/useSales.ts` (NEW) | CRUD → `/sales-orders` |
| List page | `services/web/src/pages/sales/SalesOrdersPage.tsx` (NEW) | Table; create button |
| Modal | `services/web/src/components/sales/SalesOrderModal.tsx` (NEW) | Form: customer, line items, status |
| Route | `services/web/src/App.tsx` | Add `/sales` |

#### 4d — Inventory (1–2 days)

| Task | File | Change |
|------|------|--------|
| Hook | `services/web/src/hooks/useInventory.ts` (NEW) | CRUD → `/products`, `/inventory-categories`, `/stock-items` |
| List page | `services/web/src/pages/inventory/InventoryPage.tsx` (NEW) | Tabbed: Products / Categories / Stock |
| Product modal | `services/web/src/components/inventory/ProductModal.tsx` (NEW) | Form: name, SKU, category, price |
| Stock modal | `services/web/src/components/inventory/StockModal.tsx` (NEW) | Adjust stock quantity |
| Route | `services/web/src/App.tsx` | Add `/inventory` |

#### 4e — Accounting (1–2 days)

| Task | File | Change |
|------|------|--------|
| Hook | `services/web/src/hooks/useAccounting.ts` (NEW) | CRUD → `/accounts`, `/journal-entries` |
| List page | `services/web/src/pages/accounting/AccountingPage.tsx` (NEW) | Tabbed: Chart of Accounts / Journal |
| Account modal | `services/web/src/components/accounting/AccountModal.tsx` (NEW) | Form: name, type, code |
| Journal modal | `services/web/src/components/accounting/JournalEntryModal.tsx` (NEW) | Debit/credit line entry |
| Route | `services/web/src/App.tsx` | Add `/accounting` |

---

### Phase 5 — Automation (2–3 days)

| Task | File | Change |
|------|------|--------|
| Hook | `services/web/src/hooks/useAutomation.ts` (NEW) | CRUD → `/automations`; fetch templates; fetch runs |
| List page | `services/web/src/pages/automation/AutomationPage.tsx` (NEW) | Rules list; enable/disable toggle |
| Rule builder modal | `services/web/src/components/automation/RuleBuilderModal.tsx` (NEW) | Trigger selector + condition builder + action list |
| Templates picker | `services/web/src/components/automation/TemplatesPicker.tsx` (NEW) | Grid from `/automation-templates`; one-click apply |
| Run history panel | `services/web/src/components/automation/RunHistory.tsx` (NEW) | Execution log; status + timestamp |
| Route | `services/web/src/App.tsx` | Add `/automation` |

**Acceptance criteria:** All 6 automation endpoints consumed; rules can be created from templates or scratch.

---

### Phase 6 — Settings Completion (1–2 days)

| Task | File | Change |
|------|------|--------|
| Settings tabs | `services/web/src/pages/settings/SettingsPage.tsx` | Replace 8-line placeholder; add tabs: Workspace / Members / Billing / Integrations |
| Members tab | `services/web/src/components/settings/MembersTab.tsx` (NEW) | List members; invite; role management |
| Billing tab | `services/web/src/components/settings/BillingTab.tsx` (NEW) | Plan info; upgrade CTA; payment method |
| Integrations tab | `services/web/src/components/settings/IntegrationsTab.tsx` (NEW) | OAuth apps + webhook management |

---

## 6. Technical Debt Backlog (Post-Phase 6)

| Item | File | Effort |
|------|------|--------|
| T2: Send `expected_version` | `services/web/src/hooks/useItems.ts` | 30 min |
| T4: ARIA labels | All page/component files | 2 days |
| T5: Virtual scrolling | `BoardPage.tsx` | 1 day |
| Batch item operations | `BoardPage.tsx` + `ItemDetailModal.tsx` | 2 days |
| Keyboard shortcuts beyond ⌘K | Global shortcut registry | 1 day |

---

## 7. Route Registration Summary

After all phases, `App.tsx` additions:

```
/inbox
/crm/contacts
/crm/companies
/scanned-documents
/invoicing
/purchasing
/sales
/inventory
/accounting
/automation
```

---

## 8. New Files by Directory

```
services/web/src/
  components/
    layout/
      NavRail.tsx              Phase 1
      ContextPanel.tsx         Phase 1
    crm/
      StageManager.tsx         Phase 2
    invoicing/
      InvoiceModal.tsx         Phase 4a
    purchasing/
      PurchaseOrderModal.tsx   Phase 4b
    sales/
      SalesOrderModal.tsx      Phase 4c
    inventory/
      ProductModal.tsx         Phase 4d
      StockModal.tsx           Phase 4d
    accounting/
      AccountModal.tsx         Phase 4e
      JournalEntryModal.tsx    Phase 4e
    automation/
      RuleBuilderModal.tsx     Phase 5
      TemplatesPicker.tsx      Phase 5
      RunHistory.tsx           Phase 5
    settings/
      MembersTab.tsx           Phase 6
      BillingTab.tsx           Phase 6
      IntegrationsTab.tsx      Phase 6
  hooks/
    useCRM.ts                  Phase 2
    useInvoicing.ts            Phase 4a
    usePurchasing.ts           Phase 4b
    useSales.ts                Phase 4c
    useInventory.ts            Phase 4d
    useAccounting.ts           Phase 4e
    useAutomation.ts           Phase 5
  pages/
    inbox/
      InboxPage.tsx            Phase 1
    crm/
      ContactsPage.tsx         Phase 2
      CompaniesPage.tsx        Phase 2
    documents/
      ScannedDocumentsPage.tsx Phase 3
    invoicing/
      InvoicesPage.tsx         Phase 4a
    purchasing/
      PurchaseOrdersPage.tsx   Phase 4b
    sales/
      SalesOrdersPage.tsx      Phase 4c
    inventory/
      InventoryPage.tsx        Phase 4d
    accounting/
      AccountingPage.tsx       Phase 4e
    automation/
      AutomationPage.tsx       Phase 5
services/api/database/migrations/
  XXXX_add_done_to_items_table.php   Phase 0
```

**Total: ~35 new files, ~15 modified files.**
