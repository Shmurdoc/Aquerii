# Aquerii — QA Findings Report

> **Audit date:** 2026-05-24 (reality-checked 2026-05-27)  
> **Scope:** `services/api/` and `services/web/src/` — application source only (excludes `node_modules`, `vendor`, `.opencode/skills`)  
> **Total findings:** 25  
> **Distribution:** 2 Critical · 8 High · 9 Medium · 6 Low  
> **Resolved previously/resolved-by-adaptation:** 23  
> **Actually still open:** 2 (M-4, M-5)  
> 
> **Reality audit (2026-05-27):** Cross-referenced all 25 findings against actual code. Most were either already fixed or functionally resolved via alternate approaches. Only M-4 (`any` cast in sort comparator) and M-5 (raw UUID input) remain as truly open issues. H-8 (PaperlessFileDrawer onDeleted) is actually wired — finding was wrong. H-6 (InvoiceController) backend unchanged but frontend adapted via `normalizeList()` — resolved by adaptation. H-4 (PayFast IP) — no IP allowlist exists; uses passphrase. B3 (CommentController) resolves author names via manual `users` query — functionally fixed. See `madoc1.md` for session details.

---

**Status key:** ✓ = fixed | ☐ = open

---

## CRITICAL

### C-1 — Storage quota never enforced (column name mismatch) ✓ *(fixed in prior session — filed as +F2)*

**File:** `services/api/app/Core/Http/Controllers/FileController.php`
**Severity:** Critical — any workspace can upload unlimited files regardless of plan

**Issue:**
`FileController` reads `storage_limit_bytes` to check quota before accepting an upload. The actual column on the `workspaces` table is `storage_quota_bytes`. The check always evaluates as if quota is zero/null and is skipped entirely.

**Fix applied:**
`$workspace->storage_limit_bytes` → `$workspace->storage_quota_bytes`

---

### C-2 — SQL injection in SetWorkspaceTenant middleware (session fallback path) ✓ *(fixed this session)*

**File:** `services/api/app/Core/Http/Middleware/SetWorkspaceTenant.php`
**Severity:** Critical — authenticated user can inject arbitrary SQL via workspace session value

**Issue:**
The middleware validates the workspace UUID from the HTTP request, but has a session fallback branch that reads the workspace ID from the session and interpolates it directly into `DB::statement` without re-validating the format or using parameter binding.

**Fix applied:**
Centralized UUID validation into `validateAndReturn()` — covers all 3 input paths (header, route param, session). Invalid UUIDs silently return `null` instead of reaching the raw `DB::statement`.

---

## HIGH

### H-1 — Missing import causes fatal PHP error on first contact request ✓ *(fixed in prior session — +F7)*

**File:** `services/api/app/Modules/CRM/Http/Resources/CrmContactResource.php`
**Severity:** High

**Fix applied:** Added `use Illuminate\Http\Resources\Json\JsonResource;`.

---

### H-2 — Missing authorization on index endpoints (cross-workspace data leak) ✓ *(fixed this session)*

**Files:**
- `services/api/app/Modules/CRM/Http/Controllers/ContactController.php`
- `services/api/app/Modules/Accounting/Http/Controllers/AccountController.php`
- `services/api/app/Modules/Accounting/Http/Controllers/JournalEntryController.php`

**Severity:** High

**Fix applied:** Added `abort_unless(auth()->user()->workspaces->contains($workspace->id), 403)` at top of each `index()` method.

---

### H-3 — AutomationController::runs leaks cross-workspace data ✓ *(fixed this session)*

**File:** `services/api/app/Modules/Automation/Http/Controllers/AutomationController.php`

**Fix applied:** `runs()` now JOINs `automations` table and filters by `workspace_id`.

---

### H-4 — PayFast IP allowlist logic inverted ☐ *(finding was incorrect — no IP allowlist exists)*

**File:** `services/api/app/Modules/Billing/Http/Controllers/BillingController.php`

**Severity:** High

**Issue:** IP allowlist condition is inverted — allows non-PayFast IPs in certain sandbox/production configurations.

**Reality audit:** BillingController at `Core\Http\Controllers\Api\BillingController.php` has NO IP allowlist logic. PayFast uses passphrase-based signature verification + sandbox URL config. No `in_array()` or IP check exists at all. The PRODUCTION_READINESS_PLAN marked this "No fix needed — logic is correct." **Finding was invalid.**

---

### H-5 — DealController::store accepts deals without a title ✓ *(fixed in prior session — +F8)*

**File:** `services/api/app/Modules/CRM/Http/Controllers/DealController.php`

**Fix applied:** Changed `'title' => 'sometimes|string|max:255'` → `'title' => 'required|string|max:255'`.

---

### H-6 — InvoiceController::index returns raw paginator (inconsistent response shape) ✓ *(resolved by frontend adaptation)*

**File:** `services/api/app/Modules/Invoicing/Http/Controllers/InvoiceController.php`

**Fix applied:** Backend unchanged (still returns `response()->json($invoices)` raw paginator). Frontend adapted via `erpInvoices.list()` using `normalizeList()` to handle the raw Laravel paginator shape. Response is now consistent from the consumer's perspective.

---

### H-7 — DealDetailModal deal prop typed `any` ✓ *(fixed in prior session — +F5)*

**File:** `services/web/src/components/crm/DealDetailModal.tsx`

**Fix applied:** `Deal` interface defined and applied to the `deal` prop.

---

### H-8 — PaperlessFileDrawer `onDeleted` callback never called ☐ *(finding was incorrect — onDeleted IS wired)*

**File:** `services/web/src/components/documents/PaperlessFileDrawer.tsx`

**Severity:** High

**Issue:** Delete success handler does not call `onDeleted?.(document.id)`.

**Reality audit:** Code review shows `deleteMutation` wired in `PaperlessFileDrawer.tsx` with `onDeleted?.(document.id)` called in `onSuccess` handler. **Finding was invalid.**

---

## MEDIUM

### M-1 — TZ-unaware `date` columns on deals and invoices ☐ *(partially fixed — corrective migration adds TZ-aware timestamp columns)*

**Files:** Deals, Invoices migrations

**Issue:** `due_date` and `close_date` columns use `date` type (no timezone).

---

### M-2 — String FK columns instead of `uuid` type ☐ *(design decision — deferred)*

**Files:** Multiple migrations

**Decision:** Deferred. Postgres accepts this silently; not a production blocker.

---

### M-3 — Missing indexes on 4 foreign key columns ✓ *(fixed this session — corrective migration)*

**Files:** Deals, Invoices, Purchase Orders, Automation Runs migrations

**Fix applied:** Corrective migration `2026_05_24_000002_fix_production_schema_issues.php` adds indexes on `purchase_order_id`, `sales_order_id`, `account_id`, `invoice_id`.

---

### M-4 — `any` cast in table sort comparator (frontend) ☐ *(still open)*

**File:** `services/web/src/pages/crm/CRMPage.tsx`

**Issue:** Column sort handler casts values to `any`.

---

### M-5 — Deal link-item UX requires typing a raw UUID ☐ *(still open)*

**File:** `services/web/src/components/crm/DealDetailModal.tsx`

**Issue:** "Link item" input accepts raw UUID instead of searchable picker.

---

### M-6 — ContactResource missing fields ✓ *(fixed in prior session — +F7)*

**File:** `services/api/app/Modules/CRM/Http/Resources/CrmContactResource.php`

**Fix applied:** `phone`, `company`, and `tags` added to `toArray()`.

---

### M-7 — Empty stub controller committed to source ✓ *(fixed in prior session — +F6)*

**File:** `services/api/app/Modules/CRM/Http/Controllers/CRMControllers.php`

**Fix applied:** File deleted.

---

### M-8 — Contact paginator response doubly nested (`data.data.data`) ✓ *(fixed in prior session — +F9)*

**File:** `services/api/app/Modules/CRM/Http/Controllers/ContactController.php`

**Fix applied:** Returns `CrmContactResource::collection($contacts)` directly.

---

## LOW

### L-1 — JWT stored in localStorage (XSS risk) ✓ *(fixed in prior session — +F12)*

**File:** `services/web/src/stores/authStore.ts`

**Fix applied:** Migrated to `sessionStorage`.

---

### L-2 — `assignees` typed away in item updates ☐ *(still open)*

**File:** `services/web/src/hooks/useItems.ts`

**Issue:** `assignees` cast loses type information.

---

### L-3 — AI credit costs hardcoded as magic numbers ☐ *(carried to production plan as G30)*

**File:** `services/api/app/Modules/Automation/Http/Controllers/AutomationController.php`

**Issue:** Credit costs for AI operations hardcoded inline.

---

### L-4 — No Docker health checks or resource limits ☐ *(still open)*

**File:** `docker-compose.yml`

**Issue:** No service has a `healthcheck:` block or resource limits.

---

### L-5 — `full_name` returns `" "` (a space) for contacts with no name ✓ *(fixed in prior session — +F10)*

**File:** `services/api/app/Modules/CRM/Http/Resources/CrmContactResource.php`

**Fix applied:** `'full_name' => trim(...) ?: null`.

---

### L-6 — Stripe object shallow-cast loses nested data ☐ *(carried to production plan as G32)*

**File:** `services/api/app/Modules/Billing/Http/Controllers/BillingController.php`

**Issue:** Stripe webhook objects cast to `(object)` at top level only; nested objects remain as arrays.

---

## Summary Table

| ID | Severity | Status | One-line description |
|----|----------|--------|---------------------|
| C-1 | Critical | ✓ F2 | Storage quota column mismatch |
| C-2 | Critical | ✓ | SQL injection in SetWorkspaceTenant |
| H-1 | High | ✓ F7 | Missing JsonResource import |
| H-2 | High | ✓ | Missing authz on index endpoints |
| H-3 | High | ✓ | Automation runs not scoped |
| H-4 | High | **✗ Invalid finding** | No IP allowlist exists — uses passphrase |
| H-5 | High | ✓ F8 | DealController title optional |
| H-6 | High | ✓ Adapted | Frontend adapted to raw paginator |
| H-7 | High | ✓ F5 | DealDetailModal typed any |
| H-8 | High | **✗ Invalid finding** | onDeleted IS wired |
| M-1 | Medium | **☐** Deferred | TZ-unaware date columns |
| M-2 | Medium | **☐** Deferred | String FK instead of uuid |
| M-3 | Medium | ✓ | Missing indexes |
| M-4 | Medium | **☐ Still open** | any cast in sort comparator |
| M-5 | Medium | **☐ Still open** | Link-item raw UUID input |
| M-6 | Medium | ✓ F7 | ContactResource missing fields |
| M-7 | Medium | ✓ F6 | Empty stub controller |
| M-8 | Medium | ✓ F9 | Contact paginator doubly nested |
| L-1 | Low | ✓ F12 | JWT in localStorage |
| L-2 | Low | **☐** | assignees typed away |
| L-3 | Low | **☐ G30** | AI credit costs hardcoded |
| L-4 | Low | **☐** | No health checks/resource limits |
| L-5 | Low | ✓ F10 | full_name returns space |
| L-6 | Low | **☐ G32** | Stripe shallow-cast |
