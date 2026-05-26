# Bulk Operations, Multi-Select & Soft Deletes

**Status:** DRAFT  
**Date:** 2026-05-25  
**Domain:** Frontend + Backend / All Modules

---

## 1. Problem Statement

Every list view in Aquerii requires performing actions one record at a time. No record has soft-delete support — deletes are permanent and destructive. There is no "undo" or "archive" pattern. This is a productivity blocker for users managing dozens or hundreds of records (invoices, contacts, products, tasks).

---

## 2. Scope: Which Models Get Soft Deletes

All models that represent business records (not junction tables, not logs):

| Model | Table | Priority |
|-------|-------|----------|
| Invoice | `invoices` | P0 |
| SalesOrder | `sales_orders` | P0 |
| PurchaseOrder | `purchase_orders` | P0 |
| CrmCompany | `crm_companies` | P0 |
| CrmContact | `crm_contacts` | P0 |
| CrmDeal | `crm_deals` | P0 |
| Product | `products` | P1 |
| Meeting | `meetings` | P1 (already has `softDeletesTz`) |
| Task | `tasks` | P1 |
| BoardItem | `board_items` | P1 |

Not soft-deleted (replaced/immutable): `invoice_payments`, `audit_logs`, `notifications`.

---

## 3. Backend: Adding Soft Deletes

### 3.1 Migration Pattern

```php
// Example for invoices (repeat for each table)
Schema::table('invoices', function (Blueprint $table) {
    $table->timestampTz('deleted_at')->nullable()->after('updated_at');
    $table->index('deleted_at'); // for WHERE deleted_at IS NULL query perf
});
```

### 3.2 Model Trait

```php
// All affected models: add SoftDeletes trait
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model {
    use SoftDeletes;
    // ...
}
```

### 3.3 Global Scope

Laravel's `SoftDeletes` trait automatically adds `WHERE deleted_at IS NULL` to all queries. Archived records are fetched with `Model::withTrashed()` or `Model::onlyTrashed()`.

### 3.4 Controller Adjustments

All list endpoints must respect `?show=archived` query param:

```php
public function index(Request $request, Workspace $workspace): JsonResponse {
    $query = Invoice::where('workspace_id', $workspace->id);
    
    match($request->input('show', 'active')) {
        'archived' => $query->onlyTrashed(),
        'all'      => $query->withTrashed(),
        default    => $query, // active only (default)
    };
    
    return response()->json(InvoiceResource::collection($query->paginate(50)));
}
```

Add a `restore` endpoint for each resource:
```php
// POST /api/workspaces/{w}/invoices/{id}/restore
public function restore(Workspace $workspace, string $id): JsonResponse {
    $invoice = Invoice::withTrashed()->findOrFail($id);
    $this->authorize('restore', $invoice);
    $invoice->restore();
    return response()->json(new InvoiceResource($invoice));
}
```

---

## 4. Bulk Operation Endpoints

### 4.1 Generic Bulk Action Pattern

Each resource that supports bulk ops gets a single endpoint:

```
POST /api/workspaces/{w}/{resource}/bulk
Body: { action: string, ids: string[], payload?: object }
```

```php
// BulkActionController (shared)
public function handle(Request $request, Workspace $workspace, string $resource): JsonResponse {
    $validated = $request->validate([
        'action'  => ['required', 'string', Rule::in($this->allowedActions($resource))],
        'ids'     => ['required', 'array', 'min:1', 'max:500'],
        'ids.*'   => ['uuid'],
        'payload' => ['sometimes', 'array'],
    ]);
    
    $handler = BulkActionHandlerFactory::make($resource, $validated['action']);
    $result  = $handler->handle($workspace, $validated['ids'], $validated['payload'] ?? []);
    
    return response()->json([
        'processed' => $result->processed,
        'failed'    => $result->failed,
        'errors'    => $result->errors,
    ]);
}
```

### 4.2 Allowed Actions Per Resource

```php
private function allowedActions(string $resource): array {
    return match($resource) {
        'invoices'          => ['delete', 'restore', 'send', 'mark_paid', 'void'],
        'sales-orders'      => ['delete', 'restore', 'confirm', 'cancel'],
        'purchase-orders'   => ['delete', 'restore', 'send', 'mark_received'],
        'crm/companies'     => ['delete', 'restore', 'assign_account_manager', 'export'],
        'crm/contacts'      => ['delete', 'restore', 'assign_to_company', 'export'],
        'crm/deals'         => ['delete', 'restore', 'move_stage', 'assign_owner'],
        'products'          => ['delete', 'restore', 'update_price_percent', 'assign_category'],
        'tasks'             => ['delete', 'restore', 'complete', 'assign', 'move_board'],
        default             => throw new \InvalidArgumentException("Unknown resource: $resource"),
    };
}
```

### 4.3 Handler Example: Bulk Send Invoices

```php
// BulkSendInvoicesHandler.php
public function handle(Workspace $workspace, array $ids, array $payload): BulkResult {
    $invoices = Invoice::where('workspace_id', $workspace->id)
        ->whereIn('id', $ids)
        ->whereIn('status', ['draft'])
        ->get();
    
    $processed = 0; $failed = []; $errors = [];
    
    foreach ($invoices as $invoice) {
        try {
            dispatch(new SendInvoiceJob($invoice));
            $invoice->update(['status' => 'sent', 'sent_at' => now()]);
            $processed++;
        } catch (\Exception $e) {
            $failed[] = $invoice->id;
            $errors[$invoice->id] = $e->getMessage();
        }
    }
    
    return new BulkResult($processed, $failed, $errors);
}
```

### 4.4 Bulk Update Price Percentage (Products)

```php
// BulkUpdatePriceHandler.php
// payload: { percent: 10.5, direction: 'increase'|'decrease' }
$multiplier = $payload['direction'] === 'increase'
    ? 1 + ($payload['percent'] / 100)
    : 1 - ($payload['percent'] / 100);

Product::where('workspace_id', $workspace->id)
    ->whereIn('id', $ids)
    ->update(['unit_price' => DB::raw("unit_price * {$multiplier}")]);
```

---

## 5. Export (Bulk CSV)

Available on: Invoices, Contacts, Companies, Deals, Products.

```
POST /api/workspaces/{w}/{resource}/bulk
Body: { action: "export", ids: [...] }
Response: { download_url: "..." }
```

Backend generates CSV, stores temporarily in S3 with 1-hour expiry, returns signed URL. Frontend auto-downloads.

CSV columns per resource are configurable — default set includes all relevant fields.

---

## 6. Frontend: Multi-Select State

```tsx
// hooks/useMultiSelect.ts
export function useMultiSelect<T extends { id: string }>(items: T[]) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    
    const toggle = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    
    const toggleAll = () => setSelected(
        selected.size === items.length ? new Set() : new Set(items.map(i => i.id))
    );
    
    const clear = () => setSelected(new Set());
    
    const isSelected = (id: string) => selected.has(id);
    const allSelected = selected.size === items.length && items.length > 0;
    const someSelected = selected.size > 0 && !allSelected;
    const selectedIds = [...selected];
    
    return { selected, selectedIds, toggle, toggleAll, clear, isSelected, allSelected, someSelected };
}
```

---

## 7. Frontend: BulkActionBar Component

```tsx
// components/shared/BulkActionBar.tsx
interface Action {
    label: string
    icon?: React.ComponentType
    variant?: 'default' | 'danger'
    onClick: (ids: string[]) => void | Promise<void>
}

interface Props {
    selectedIds: string[]
    actions: Action[]
    onClear: () => void
    totalCount?: number  // for "select all N records" prompt
    onSelectAll?: () => void
}

// Renders as fixed bottom bar; animates in/out via CSS transform
// Shows spinner on async actions; disables bar during processing
// Shows toast on completion: "3 invoices sent" / "2 failed — see details"
```

---

## 8. Confirmation Dialogs

Destructive bulk actions show a confirmation dialog:

- **Soft delete**: "Archive 5 invoices? They can be restored from the Archived view."
- **Permanent delete** (from archived view): "Permanently delete 5 invoices? This cannot be undone. Associated payments and line items will also be deleted."
- **Void invoice**: "Void 3 invoices? This marks them as uncollectable and cannot be undone."

---

## 9. Cascade Consequences (Permanent Delete)

| Record Deleted | Cascades To |
|---------------|------------|
| Invoice | invoice_items, invoice_payments (warn user) |
| Sales Order | sales_order_items; sets invoice.sales_order_id = null |
| CRM Company | contacts remain (company_id nulled); deals remain (company_id nulled) |
| CRM Deal | deal_activities |
| Product | sales_order_items, purchase_order_items (set product_id = null, keep description) |

---

## 10. Audit Trail

All bulk operations write to `audit_logs`:
```php
AuditLog::create([
    'workspace_id' => $workspace->id,
    'user_id'      => auth()->id(),
    'action'       => "bulk.{$action}",
    'resource'     => $resource,
    'meta'         => ['ids' => $ids, 'processed' => $result->processed],
]);
```

---

## 11. Success Criteria

- [ ] `deleted_at` migration applied to all P0 models (invoices, sales_orders, purchase_orders, crm_companies, crm_contacts, crm_deals)
- [ ] All P0 models use `SoftDeletes` trait; global scope active
- [ ] List endpoints respect `?show=archived|all|active`
- [ ] `restore` endpoint per resource
- [ ] `POST /{resource}/bulk` endpoint with `BulkActionHandlerFactory`
- [ ] Handlers: delete, restore, send (invoices), mark_paid (invoices), confirm (SOs), export CSV
- [ ] `useMultiSelect` hook implemented
- [ ] `BulkActionBar` component: animated, loading state, toast on completion
- [ ] Archived filter pill + 50% opacity styling on all P0 list views
- [ ] Confirmation dialog for destructive bulk actions
- [ ] All bulk ops written to `audit_logs`
- [ ] Tests: bulk delete (soft), bulk restore, bulk send, export CSV endpoint
