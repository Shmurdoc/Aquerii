# Aquerii QA Audit Report

**Date:** 2026-05-24  
**Scope:** Backend (Laravel API), Frontend (React/TypeScript), Database Migrations, Docker/Infrastructure  
**Excludes:** `node_modules`, `.opencode/skills`, vendor directories

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2     |
| HIGH     | 8     |
| MEDIUM   | 9     |
| LOW      | 6     |
| **Total**| **25**|

---

## CRITICAL

### C-1 — Wrong column name: storage quota never enforced
**File:** `services/api/app/Core/Http/Controllers/Api/FileController.php:48`

`FileController` reads `$workspace->storage_limit_bytes`, but the actual column in the database (migration `2024_01_01_000001_create_core_tables.php:31`) is `storage_quota_bytes`. The property always resolves to `null`, so `$limit` falls back to the hardcoded 5 GB default on every upload regardless of the workspace plan. No workspace can ever exceed its storage quota.

**Fix:** Change line 48:
```php
// Before
$limit = (int) ($workspace->storage_limit_bytes ?? 5368709120);
// After
$limit = (int) ($workspace->storage_quota_bytes ?? 5368709120);
```
Also add `storage_quota_bytes` to `Workspace::$fillable` if not already present.

---

### C-2 — SQL injection via session fallback in RLS middleware
**File:** `services/api/app/Core/Http/Middleware/SetWorkspaceTenant.php:38,48`

The UUID format is validated when the value comes from the request (line 27), but the session fallback path (`session('workspace_id')`, line 76) bypasses that validation entirely and feeds the raw value straight into `DB::statement("SET app.current_workspace_id = '{$workspaceId}'")`  (line 38). If an attacker can write to the session (e.g. via a forged cookie on a misconfigured `APP_KEY`), they can inject arbitrary PostgreSQL. The `userId` path (line 48) has no validation at all.

**Fix:** Move the UUID validation to `resolveWorkspaceId()` so it applies to all three resolution paths, and use parameterised `pg_query_params`-style calls or at minimum validate before every `DB::statement` call:
```php
private function validateUuid(string $id): bool
{
    return (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id);
}
```
Apply to `$userId` as well.

---

## HIGH

### H-1 — `CrmContactResource` extends undefined `JsonResource`
**File:** `services/api/app/Modules/CRM/Http/Resources/CrmContactResource.php:7`

The class declaration is `class CrmContactResource extends JsonResource` but there is no `use Illuminate\Http\Resources\Json\JsonResource;` import. This will throw a fatal `Class "App\Modules\CRM\Http\Resources\JsonResource" not found` error the first time any contact resource is rendered.

**Fix:** Add the missing import:
```php
use Illuminate\Http\Resources\Json\JsonResource;
```

---

### H-2 — `ContactController::index` missing authorization
**File:** `services/api/app/Modules/CRM/Http/Controllers/ContactController.php:13`

`index` has no `$this->authorize(...)` call and no policy gate. Any authenticated user who knows a `workspace_id` UUID can enumerate all contacts in that workspace. Compare with `store` (line 39) which does call `authorize`. The same gap exists in `AccountController::index` (line 13) and `JournalEntryController::index` (line 14).

**Fix:** Add authorization gates to all index methods:
```php
$this->authorize('viewAny', [CrmContact::class, $workspace]);
```

---

### H-3 — `AutomationController::runs` does not verify workspace ownership
**File:** `services/api/app/Modules/Automation/Http/Controllers/AutomationController.php:110`

`runs()` fetches automation run history filtered only by `automation_id`, not by `workspace_id`. An authenticated user from workspace A can pass any `automationId` and receive run logs from workspace B if they know the UUID.

**Fix:**
```php
$runs = DB::table('automation_runs')
    ->join('automations', 'automations.id', '=', 'automation_runs.automation_id')
    ->where('automations.workspace_id', $workspace->id)
    ->where('automation_runs.automation_id', $automationId)
    ->orderBy('automation_runs.created_at', 'desc')
    ->limit(100)
    ->get();
```

---

### H-4 — PayFast IP allowlist logic inverted for production
**File:** `services/api/app/Core/Http/Controllers/Api/WebhookController.php:191`

```php
if (! in_array($request->ip(), $validIps) && config('services.payfast.sandbox')) {
    return true; // Allow all IPs in sandbox
}
```

The condition is logically correct for sandbox mode, but the code falls through to `return in_array($request->ip(), $validIps)` for *all* non-PayFast IPs when `sandbox` is false. More critically, if `services.payfast.sandbox` is accidentally left `true` in production (a common misconfiguration), any IP can trigger payment callbacks and credit any workspace with a paid plan.

**Fix:** Explicitly check environment and fail closed:
```php
if (app()->environment('production') && !in_array($request->ip(), $validIps)) {
    return false;
}
return true;
```

---

### H-5 — `DealController::store` — `title` not required
**File:** `services/api/app/Modules/CRM/Http/Controllers/DealController.php` (store validation)

The `title` field uses `'sometimes'` rather than `'required'`. A deal can be created with no title, producing nameless records that break frontend display logic (e.g. `DealDetailModal.tsx:113` renders `deal.title` directly).

**Fix:** Change validation rule:
```php
'title' => 'required|string|max:255',
```

---

### H-6 — `InvoiceController::index` returns raw paginator, inconsistent shape
**File:** `services/api/app/Modules/Invoicing/Http/Controllers/InvoiceController.php:13`

`index` returns the paginator object directly (`$invoices`), which serialises differently to every other controller in the codebase (which all return `['data' => $collection->items()]` or similar). The frontend receives a different JSON shape for invoices, likely causing runtime errors when iterating.

**Fix:**
```php
return response()->json(['data' => $invoices->items(), 'meta' => [
    'current_page' => $invoices->currentPage(),
    'last_page'    => $invoices->lastPage(),
    'total'        => $invoices->total(),
]]);
```

---

### H-7 — `DealDetailModal` prop typed `any`
**File:** `services/web/src/components/crm/DealDetailModal.tsx:11`

```ts
interface Props {
  deal: any
  ...
}
```

The modal accepts any shape for `deal`, disabling TypeScript's ability to catch incorrect field access at compile time. Errors (e.g. `deal.title`, `deal.value`, `deal.currency`, `deal.stage`) only surface at runtime.

**Fix:** Define and use a proper `Deal` interface from the CRM domain types.

---

### H-8 — `PaperlessFileDrawer` `onDeleted` prop declared but never called
**File:** `services/web/src/components/documents/PaperlessFileDrawer.tsx:35`

The `Props` interface declares `onDeleted: () => void` but the drawer never triggers it — there is no delete button and no delete mutation. If the parent component relies on this callback to refresh the document list after a delete, it will never fire.

**Fix:** Either implement a delete mutation and call `onDeleted()` on success, or remove the prop from the interface to prevent misleading callers.

---

## MEDIUM

### M-1 — `crm_deals.won_at` / `lost_at` are non-timezone timestamps
**File:** `services/api/database/migrations/2024_01_01_000007_fix_crm_deals_columns.php:13,16`

```php
$table->timestamp('won_at')->nullable();
$table->timestamp('lost_at')->nullable();
```

All other datetime columns in the schema use `timestampTz()`. These two use plain `timestamp`, storing times without timezone. Clients in non-UTC timezones will see incorrect closed-deal timestamps.

**Fix:** Use `timestampsTz` or add a new migration to alter the column types to `TIMESTAMPTZ`.

---

### M-2 — `invoices` table uses non-TZ timestamps
**File:** `services/api/database/migrations/2026_05_22_000001_create_invoices_table.php`

The invoices table uses `timestamps()` + `softDeletes()` (non-timezone-aware) while all other module tables use `timestampsTz()` + `softDeletesTz()`. Invoice due dates and audit times will be stored without timezone context.

**Fix:** Migrate to `timestampTz` columns or create an `ALTER TABLE` migration.

---

### M-3 — `purchase_orders.supplier_id` and `sales_orders.customer_id` typed as `string(255)` not `uuid`
**Files:** `services/api/database/migrations/2026_05_23_000001_create_purchasing_tables.php`, `2026_05_23_000002_create_sales_tables.php`

These FK-like columns are `string(255)` while every other relationship ID in the schema is `uuid`. There are no FK constraints, so referential integrity is not enforced and the inconsistency can cause silent data corruption if non-UUID strings are stored.

**Fix:** Change to `$table->uuid('supplier_id')->nullable()` and add FK constraints referencing the appropriate contacts/companies table.

---

### M-4 — Missing indexes on FK columns
**Files:** Multiple migration files

The following FK columns have no explicit index, leading to full table scans on joins and lookups:

| Table | Column |
|-------|--------|
| `purchase_order_items` | `purchase_order_id` |
| `sales_order_items` | `sales_order_id` |
| `journal_entries` | `account_id` |
| `invoice_items` | `invoice_id` |

**Fix:** Add `$table->index('column_name')` in each respective migration or in a follow-up migration.

---

### M-5 — `TableView` uses `(a as any)[sortKey]` for sort
**File:** `services/web/src/components/board/TableView.tsx:33-34`

```ts
let av: any = (a as any)[sortKey]
let bv: any = (b as any)[sortKey]
```

Dynamic key access with `any` cast bypasses type safety. If `sortKey` is ever set to a value not present on `Item`, the sort silently returns `null` for every value, making all items appear equal.

**Fix:** Narrow the allowed sort keys to a typed union of `keyof Item` and use a type guard or mapped accessor.

---

### M-6 — `DealDetailModal` item-link UX: user must type a raw UUID
**File:** `services/web/src/components/crm/DealDetailModal.tsx:142`

```tsx
<input placeholder="Enter item ID to link…" ... />
```

The UI asks the user to type a UUID to link an item to a deal. This is unusable in practice. The `items` query (line 37) is defined but `enabled: false` — it is never fetched, so no searchable list is available.

**Fix:** Enable the items query and replace the raw input with a searchable combobox displaying item titles.

---

### M-7 — `CrmContactResource` missing fields (`stage_id`, `notes`, `deal_value`)
**File:** `services/api/app/Modules/CRM/Http/Resources/CrmContactResource.php`

The resource only returns `id`, `full_name`, `email`, `phone`, `lead_score`, `company_id`, `tags`, `created_at`. Fields like `stage_id`, `notes`, and `deal_value` — all present in `$fillable` and in the migration — are omitted. Any frontend that reads from this resource rather than the raw model will not see those fields.

**Fix:** Add the missing fields to `toArray()`, or switch to `$this->only([...])` with an explicit complete list.

---

### M-8 — Empty stub file left in CRM module
**File:** `services/api/app/Modules/CRM/Http/Controllers/CRMControllers.php`

The file contains only a comment and no class. It serves no purpose and may confuse autoloaders or future developers.

**Fix:** Delete the file.

---

### M-9 — `ContactController::index` returns full paginator object, not items array
**File:** `services/api/app/Modules/CRM/Http/Controllers/ContactController.php:34`

```php
return response()->json(['data' => $contacts]);
```

`$contacts` is the paginator object (from `->paginate(50)`), which will serialize as a full paginator envelope inside a `data` key — creating a doubly-wrapped shape `{ data: { data: [...], total: ..., ... } }`. The frontend will need to unwrap twice.

**Fix:** Return `$contacts->items()` for data and expose pagination metadata separately, consistent with other endpoints.

---

## LOW

### L-1 — Auth token stored in `localStorage`
**File:** `services/web/src/stores/authStore.ts`

JWT tokens persisted in `localStorage` are accessible to any JavaScript running on the page, making them vulnerable to XSS theft. `sessionStorage` or `HttpOnly` cookies provide better isolation.

**Fix:** Prefer `HttpOnly` cookie transport for the auth token, or at minimum document the risk and add a strict CSP header.

---

### L-2 — `assignees` items typed `any` in `TableView`
**File:** `services/web/src/components/board/TableView.tsx:179`

```ts
{item.assignees.slice(0, 3).map((a: any) => (
```

If the `Item` type already defines `assignees` as a typed array, the explicit `: any` cast overrides type safety. Use the existing `assignee` type instead.

---

### L-3 — Hardcoded AI credit costs in UI
**File:** `services/web/src/components/documents/PaperlessFileDrawer.tsx:258,272,288`

Credit costs (6, 4, 5) are hardcoded strings in the UI. If the pricing changes, the UI will silently show stale values.

**Fix:** Drive credit costs from a shared constant or from an API response.

---

### L-4 — Docker services have no health checks or resource limits
**File:** `docker-compose.yml`

None of `api`, `postgres`, `redis`, `meilisearch`, or `minio` define `healthcheck` or `deploy.resources.limits`. In production this means:
- No readiness gating (dependents start before the service is ready)
- Runaway containers can exhaust host memory/CPU

**Fix:** Add `healthcheck` blocks and `mem_limit`/`cpus` constraints appropriate for the target environment.

---

### L-5 — `CrmContact.getFullNameAttribute` can return `" "` for empty names
**File:** `services/api/app/Modules/CRM/Models/CrmContact.php:33`

```php
return "{$this->first_name} {$this->last_name}";
```

If both fields are empty strings (possible since the migration adds them with `default('')`), `full_name` returns `" "` — a single space — which is truthy and will display as blank in the UI without obvious indication of the problem.

**Fix:**
```php
return trim("{$this->first_name} {$this->last_name}") ?: 'Unnamed Contact';
```

---

### L-6 — `WebhookController::handleSubscriptionUpsert` uses raw array cast on Stripe object
**File:** `services/api/app/Core/Http/Controllers/Api/WebhookController.php:119`

```php
'payload' => json_encode((array) $sub),
```

Casting a nested Stripe `\Stripe\StripeObject` to `(array)` with PHP's native cast only shallowly converts the outer object; nested objects remain as `StripeObject` instances and will serialize as empty arrays `{}`. Use `$sub->toArray()` instead for complete serialization.

**Fix:**
```php
'payload' => json_encode($sub->toArray()),
```

---

## Appendix: Files Audited

**Backend (PHP)**
- `app/Core/Models/`: User, Workspace, Item, Board, WorkspaceMember
- `app/Core/Http/Controllers/Api/`: AuthController, FileController, WorkspaceController, BillingController, WebhookController, ItemController, BoardController
- `app/Core/Http/Middleware/`: SetWorkspaceTenant
- `app/Modules/CRM/`: CrmContact, CrmDeal, CrmActivity, CrmPipeline models; ContactController, DealController, CrmActivityController; CrmContactResource; CRMControllers stub
- `app/Modules/Invoicing/`: InvoiceController, Invoice model
- `app/Modules/Inventory/`: ProductController, StockItemController, InventoryCategoryController
- `app/Modules/Accounting/`: AccountController, JournalEntryController
- `app/Modules/Automation/`: AutomationController
- `database/migrations/`: All 27 migration files

**Frontend (TypeScript/React)**
- `src/hooks/`: useItems, useBoards, useSocket
- `src/stores/`: authStore
- `src/pages/crm/`: CRMPage
- `src/components/board/`: ItemDetailModal, TableView, BoardPage
- `src/components/crm/`: DealDetailModal
- `src/components/documents/`: PaperlessFileDrawer

**Infrastructure**
- `docker-compose.yml`
