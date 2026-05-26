# Supplier / Customer Entity Linking & CRM Enhancement

**Status:** ENHANCED DRAFT  
**Date:** 2026-05-25  
**Domain:** ERP / CRM Integration

---

## 1. Problem Statement

**Three sources of truth for the same concept exist simultaneously:**

1. `crm_companies` — already in the schema (with name, domain, industry, size, country, custom_fields)
2. `crm_contacts` — individuals with company_id FK to crm_companies
3. `sales_orders.customer_name` / `purchase_orders.supplier_name` — free-text strings with no FK

The result: "Acme Corp" in CRM has no connection to the `customer_name = 'Acme Corp'` on five invoices. You cannot answer "What is the total revenue from Acme Corp?" or "Which supplier do we owe money to?" without manual lookup.

Additionally, the CRM pipeline has no drag-and-drop (the `move` endpoint exists but DnD is not implemented), no pipeline analytics, no contact import, and no email integration.

---

## 2. Entity Type Tags

`crm_companies` already exists with `domain`, `industry`, `size`, `country`, `custom_fields`. Add type classification:

```php
// Migration: enhance crm_companies
Schema::table('crm_companies', function (Blueprint $table) {
    $table->string('entity_type', 50)->default('customer');
    // Values: 'customer' | 'supplier' | 'both' | 'prospect' | 'partner'
    $table->string('phone')->nullable()->after('email');
    $table->text('address')->nullable()->after('phone');
    $table->string('city')->nullable();
    $table->string('country', 100)->nullable()->change(); // already exists
    $table->string('vat_number')->nullable()->after('country');
    $table->string('currency', 10)->default('USD')->after('vat_number');
    $table->integer('payment_terms_days')->default(30)->after('currency');
    $table->decimal('credit_limit', 15, 2)->nullable()->after('payment_terms_days');
    $table->string('status', 50)->default('active'); // active|inactive|blocked
    $table->uuid('account_manager_id')->nullable(); // FK to users
    $table->decimal('total_revenue', 15, 2)->default(0); // denormalised, updated by observer
    $table->decimal('total_outstanding', 15, 2)->default(0); // unpaid invoices sum
    $table->timestampTz('deleted_at')->nullable(); // soft delete
    $table->index(['workspace_id', 'entity_type']);
});
```

---

## 3. Linking ERP Documents to Entities

```php
// Migration: link_orders_to_crm_entities
Schema::table('sales_orders', function (Blueprint $table) {
    $table->uuid('customer_company_id')->nullable()->after('workspace_id');
    $table->foreign('customer_company_id')->references('id')->on('crm_companies')->nullOnDelete();
});

Schema::table('invoices', function (Blueprint $table) {
    $table->uuid('customer_company_id')->nullable()->after('workspace_id');
    $table->foreign('customer_company_id')->references('id')->on('crm_companies')->nullOnDelete();
});

Schema::table('purchase_orders', function (Blueprint $table) {
    $table->uuid('supplier_company_id')->nullable()->after('workspace_id');
    $table->foreign('supplier_company_id')->references('id')->on('crm_companies')->nullOnDelete();
});
```

**Backward compatibility:** existing free-text `customer_name`, `supplier_name` fields kept. The `_company_id` FK is nullable. When linked, name is synced from company; when unlinked, falls back to text field.

---

## 4. Name Sync Observer

```php
// app/Observers/CrmCompanyObserver.php
public function updated(CrmCompany $company): void {
    if ($company->isDirty('name')) {
        SalesOrder::where('customer_company_id', $company->id)
            ->update(['customer_name' => $company->name]);
        Invoice::where('customer_company_id', $company->id)
            ->update(['customer_name' => $company->name]);
        PurchaseOrder::where('supplier_company_id', $company->id)
            ->update(['supplier_name' => $company->name]);
    }
}

// Recalculate totals on invoice payment
public function recalculateRevenue(CrmCompany $company): void {
    $revenue = Invoice::where('customer_company_id', $company->id)
        ->where('status', 'paid')->sum('total');
    $outstanding = Invoice::where('customer_company_id', $company->id)
        ->whereIn('status', ['sent', 'partially_paid', 'overdue'])->sum('amount_due');
    $company->update(['total_revenue' => $revenue, 'total_outstanding' => $outstanding]);
}
```

---

## 5. EntitySelector Component

Replaces free-text name fields in all order creation forms:

```tsx
// components/shared/EntitySelector.tsx
interface Props {
  type: 'customer' | 'supplier' | 'any'
  value: { id: string; name: string } | null
  onChange: (entity: { id: string; name: string; email?: string; currency?: string } | null) => void
  allowCreate?: boolean
  placeholder?: string
}

// Behaviour:
// - Debounced typeahead search: GET /crm/companies/search?q=&type=customer
// - Shows entity type badge, vat number if present
// - "Create new [customer/supplier]" option at bottom of list
// - Quick-create modal: name, email, phone, type (pre-filled to prop type)
// - Selecting entity auto-fills: name, email, billing address, currency, payment_terms
// - Shows linked company tag on saved forms; click to open Entity 360
```

---

## 6. CRM Pipeline — Drag & Drop

The `move` endpoint (`POST .../deals/{id}/move`) exists but DnD is unimplemented in the UI.

### 6.1 Implementation: `@dnd-kit/sortable`

```tsx
// Install: npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

// In CRMPage — wrap kanban board
<DndContext onDragEnd={handleDragEnd} sensors={sensors} collisionDetection={closestCenter}>
  {stages.map(stage => (
    <DroppableColumn key={stage.id} stageId={stage.id}>
      <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
        {deals.map(deal => <DraggableDealCard key={deal.id} deal={deal} />)}
      </SortableContext>
    </DroppableColumn>
  ))}
</DndContext>
```

`handleDragEnd`: calls `moveDeal(dealId, newStageId, newPosition)` optimistically, reverting on error.

---

## 7. Contact Import (CSV)

```tsx
// Settings > Team > Contacts tab: Import button
// Or CRM Contacts page: "Import CSV" button
```

Backend endpoint: `POST /api/workspaces/{w}/crm/contacts/import`
- Accepts CSV with columns: name, email, phone, job_title, company_name, city, country
- Creates contacts and companies (matching by company name, or creating new)
- Returns: `{ imported: N, skipped: N, errors: [...] }`
- Rate limited to 500 rows per request

---

## 8. Duplicate Detection

When creating a contact or company, check for near-duplicates:

```php
// CrmCompanyController::store()
$similar = CrmCompany::where('workspace_id', $workspace->id)
    ->where(DB::raw('lower(name)'), 'like', '%' . strtolower(substr($name, 0, 5)) . '%')
    ->limit(3)->get(['id', 'name', 'email']);

if ($similar->isNotEmpty()) {
    return response()->json([
        'warning' => 'possible_duplicate',
        'similar' => $similar,
    ], 200); // frontend shows "Did you mean...?" modal
}
```

Frontend shows a warning with the similar records before confirming creation.

---

## 9. Entity 360 View

A unified profile page for any company, accessible from:
- CRM Companies list
- Invoice detail ("View Customer")
- SO/PO detail ("View Supplier/Customer")

**Route:** `/crm/companies/{id}`

```
┌─────────────────────────────────────────────────────────┐
│ Acme Corp                        [Edit] [+ New Invoice] │
│ Customer & Supplier · Active · acme.com                 │
│ Account Manager: John Smith                             │
├──────────────┬──────────────┬──────────────┬────────────┤
│ $42,300      │ $1,800 due   │ 3 open SO    │ 1 open PO  │
│ Total Revenue│ Outstanding  │              │            │
├─────────────────────────────────────────────────────────┤
│ Tabs: Overview · Contacts · Deals · Orders · Invoices   │
│       Activities · Files · Notes                        │
├─────────────────────────────────────────────────────────┤
│ [Overview Tab]                                          │
│ Contact: Jane Doe (CFO) · jane@acme.com · +27 11 xxx    │
│ VAT: VAT-123  · Currency: USD · Terms: Net 30           │
│ Address: 1 Main St, Johannesburg                        │
│                                                         │
│ Recent Activity:                                        │
│ • Invoice INV-0041 sent · 2 days ago                    │
│ • Deal "Q4 Contract" moved to Won · 5 days ago          │
│ • Call logged by John · 1 week ago                      │
└─────────────────────────────────────────────────────────┘
```

Each tab shows:
- **Contacts**: people at this company (with their role/title), + Add Contact
- **Deals**: pipeline deals linked to this company, with stage and value
- **Sales Orders**: SO table filtered by `customer_company_id`
- **Invoices**: Invoice table filtered by `customer_company_id`; total/outstanding summary
- **Purchase Orders**: PO table filtered by `supplier_company_id`
- **Activities**: timeline of calls/emails/meetings/notes (from `crm_activities`)
- **Files**: uploaded files linked to this company
- **Notes**: rich-text notes

---

## 10. CRM Pipeline Analytics

New sub-page: `/crm/analytics`

Charts (all hand-rolled SVG or lightweight charting):
1. **Pipeline funnel** — deals by stage with count and value
2. **Win/Loss rate** — pie chart: won vs lost vs in-progress (last 90 days)
3. **Average deal age** — days from creation to close, by stage
4. **Revenue forecast** — bar chart of expected close amounts by month
5. **Top performers** — leaderboard of deals won by owner
6. **Lead sources** — breakdown by source (if tracked in custom_fields)

---

## 11. CRM Activity Notifications

When a deal is:
- Assigned to a new owner: notify new owner
- Moved to a won/lost stage: notify deal creator and workspace managers
- Approaching expected close date (3 days): notify deal owner
- Has no activity for 7 days: notify deal owner ("This deal needs attention")

Uses existing `notifications` table + broadcasting.

---

## 12. Soft Deletes for CRM Entities

Add soft deletes to `crm_companies`, `crm_contacts`, `crm_deals`:
- Soft-deleted companies/contacts remain linked to existing orders (nullOnDelete is wrong for archiving)
- Show "Archived" filter in lists
- "Restore" action in archived view
- Permanently delete only from archived state (with cascade warning)

---

## 13. API Endpoints (New/Enhanced)

```
GET  /api/workspaces/{w}/crm/companies              — list with type filter, search, pagination
POST /api/workspaces/{w}/crm/companies              — create with duplicate check
GET  /api/workspaces/{w}/crm/companies/{id}         — full profile with stats
PUT  /api/workspaces/{w}/crm/companies/{id}         — update
DELETE /api/workspaces/{w}/crm/companies/{id}       — soft delete
POST /api/workspaces/{w}/crm/companies/{id}/restore — restore soft-deleted
GET  /api/workspaces/{w}/crm/companies/search       — typeahead: ?q=&type=customer
POST /api/workspaces/{w}/crm/contacts/import        — CSV import
GET  /api/workspaces/{w}/crm/analytics              — pipeline metrics
```

---

## 14. Open Questions

- Should contacts have their own 360 view, or only companies?
- Deal linked to company vs contact: currently deals have both `company_id` and `contact_id`. Should the primary entity for a deal be the company or the contact?
- Product/supplier linkage: should `products` have a preferred `supplier_company_id`?

---

## 15. Success Criteria

- [ ] `crm_companies` has entity_type, payment_terms, credit_limit, soft delete
- [ ] All SO/Invoice/PO forms have EntitySelector with typeahead
- [ ] Name sync observer keeps denormalised fields accurate
- [ ] Entity 360 view shows all orders, invoices, deals, activities
- [ ] CRM Pipeline has functional drag-and-drop with `@dnd-kit`
- [ ] Duplicate detection warning on company/contact creation
- [ ] CSV contact import: 500 rows, handles company name matching
- [ ] Pipeline analytics page with 5 charts
- [ ] Tests: entity linking integration; DnD move API; CSV import parser
