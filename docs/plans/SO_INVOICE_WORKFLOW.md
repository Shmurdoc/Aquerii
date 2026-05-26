# Full Commerce Workflow: Quote → SO → Invoice → Receipt

**Status:** ENHANCED DRAFT  
**Date:** 2026-05-25  
**Domain:** ERP / Sales / Invoicing

---

## 1. Problem Statement

Aquerii has separate Invoicing and Sales Order modules with no workflow linking them. The complete commercial lifecycle — quote, confirm, invoice, collect payment, receipt — requires manually recreating data at each step. Additionally: no recurring invoices, no approval gates, no inventory deduction on confirmation, no credit notes for refunds, and order numbers are random strings.

---

## 2. Complete Commercial Lifecycle

```
CRM Deal (Won)
    │
    ▼
QUOTE (SO status=quotation)
    │  ── "Approve Quote" ──►  SALES ORDER (confirmed)
    │                               │
    │                               ├── Inventory reserved
    │                               ├── Shipment tracking
    │                               ▼
    │                         DELIVERY NOTE (PDF)
    │                               │
    │  ◄── "Convert to Invoice" ────┘
    ▼
INVOICE (draft → sent → paid)
    │
    ├── Payment collected
    ├── Accounting journal posted (DR Cash / CR AR)
    ▼
PAYMENT RECEIPT (PDF + email)
    │
    └── [If refund needed] → CREDIT NOTE
```

### Parallel PO Lifecycle

```
PURCHASE ORDER (draft → sent → confirmed → received)
    │
    ├── "Mark as Received" → Goods Receipt Note (GRN)
    │       │
    │       └── Stock items auto-created in Inventory
    │
    └── Accounting journal posted (DR Inventory / CR AP)
```

---

## 3. State Machines (Enhanced)

### 3.1 Sales Order States

```
draft
  └─► quotation   (send to customer for approval)
        └─► confirmed  (customer accepted)
              ├─► partially_shipped
              ├─► shipped
              │     └─► delivered
              └─► cancelled
```

New columns on `sales_orders`:
```php
$table->string('invoice_status', 50)->default('not_invoiced');
// not_invoiced | partially_invoiced | fully_invoiced
$table->uuid('primary_invoice_id')->nullable();
$table->uuid('approved_by')->nullable();
$table->timestampTz('approved_at')->nullable();
$table->string('shipping_carrier')->nullable();
$table->string('tracking_number')->nullable();
$table->decimal('discount_amount', 15, 2)->default(0);
$table->string('discount_type', 20)->default('fixed');
$table->decimal('discount_value', 10, 4)->default(0);
```

### 3.2 Purchase Order States

```
draft
  └─► sent        (to supplier)
        └─► confirmed  (supplier acknowledged)
              ├─► partially_received
              └─► received
                    └─► [matched to AP invoice]
```

New columns on `purchase_orders`:
```php
$table->uuid('approved_by')->nullable();
$table->timestampTz('approved_at')->nullable();
$table->timestampTz('received_at')->nullable();
$table->uuid('received_by')->nullable();
$table->decimal('discount_amount', 15, 2)->default(0);
```

### 3.3 Invoice States (Enhanced)

```
draft
  └─► sent
        ├─► partially_paid
        │     └─► paid
        ├─► paid
        ├─► overdue         (auto-transitioned by scheduler)
        └─► void
              └─► [if payment existed] → credit_note
```

New columns on `invoices`:
```php
$table->uuid('sales_order_id')->nullable();   // source SO
$table->uuid('customer_id')->nullable();       // FK to crm_companies
$table->decimal('discount_amount', 15, 2)->default(0);
$table->string('discount_type', 20)->default('fixed');
$table->decimal('discount_value', 10, 4)->default(0);
$table->decimal('amount_paid', 15, 2)->default(0);
$table->decimal('amount_due', 15, 2)->nullable(); // total - amount_paid
$table->string('public_token', 64)->nullable()->unique();
$table->boolean('public_link_enabled')->default(false);
$table->string('payment_method', 100)->nullable(); // cash|bank_transfer|card|payfast|stripe
$table->string('payment_reference')->nullable();   // bank ref, transaction ID
```

---

## 4. Quote Flow

### 4.1 Create Quote (SO with status = `quotation`)

When creating an SO, the first status option is `quotation`. This generates:
- Document number: `QT-0042`
- PDF: Quote template (not a tax invoice)
- Action: "Send Quote" → emails PDF to customer; sets status = `quotation`

### 4.2 Quote Approval

Two paths:
1. **Internal approval**: Manager clicks "Approve" → status = `confirmed`
2. **Customer approval**: Customer clicks "Accept Quote" on public quote URL → webhook fires → status = `confirmed` (optional, Phase 2)

---

## 5. Convert SO → Invoice

```php
// POST /api/workspaces/{w}/sales/orders/{order}/convert-to-invoice
public function convertToInvoice(Workspace $workspace, SalesOrder $order, Request $request): JsonResponse {
    $this->authorize('convert', $order);
    
    abort_if($order->status !== 'confirmed', 422, 'Only confirmed orders can be invoiced');
    abort_if($order->invoice_status === 'fully_invoiced', 422, 'Already fully invoiced');
    
    $invoice = DB::transaction(function () use ($order, $workspace, $request) {
        $invoice = Invoice::create([
            'workspace_id'    => $workspace->id,
            'sales_order_id'  => $order->id,
            'customer_id'     => $order->customer_id,
            'invoice_number'  => app(SequenceService::class)->next($workspace, 'invoice'),
            'customer_name'   => $order->customer_name,
            'customer_email'  => $order->customer_email,
            'billing_address' => $order->shipping_address,
            'currency'        => $order->currency,
            'issue_date'      => now()->toDateString(),
            'due_date'        => now()->addDays($workspace->settings['payment_terms_days'] ?? 30)->toDateString(),
            'status'          => 'draft',
            'subtotal'        => $order->subtotal,
            'tax_total'       => $order->tax_total,
            'discount_amount' => $order->discount_amount,
            'total'           => $order->total,
            'notes'           => $request->input('notes', $order->notes),
        ]);
        
        foreach ($order->items as $item) {
            $invoice->items()->create([
                'description'      => $item->description,
                'quantity'         => $item->quantity,
                'unit_price'       => $item->unit_price,
                'tax_rate'         => $item->tax_rate,
                'discount_percent' => $item->discount_percent ?? 0,
                'total'            => $item->total,
                'product_id'       => $item->product_id,
            ]);
        }
        
        $order->update([
            'invoice_status'     => 'fully_invoiced',
            'primary_invoice_id' => $invoice->id,
        ]);
        
        $this->audit('sales_order.converted_to_invoice', $order, [], ['invoice_id' => $invoice->id]);
        
        return $invoice;
    });
    
    return response()->json(new InvoiceResource($invoice), 201);
}
```

---

## 6. Invoice Payment Recording

### 6.1 Record Payment Endpoint

```
POST /api/workspaces/{w}/invoices/{id}/payments
Body: { amount, payment_date, payment_method, payment_reference, notes }
```

```php
Schema::create('invoice_payments', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('invoice_id');
    $table->decimal('amount', 15, 2);
    $table->date('payment_date');
    $table->string('payment_method', 100);
    $table->string('payment_reference')->nullable();
    $table->text('notes')->nullable();
    $table->uuid('recorded_by');
    $table->timestampTz('created_at');
    $table->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
});
```

After recording payment:
- If `amount_paid >= total`: status → `paid`, set `paid_at`
- If `amount_paid < total`: status → `partially_paid`
- Auto-create accounting journal entry: `DR Cash / CR Accounts Receivable`
- Dispatch receipt email with Payment Receipt PDF

### 6.2 Overdue Automation

Scheduled command (daily): `php artisan invoices:check-overdue`
- Find all `sent` invoices where `due_date < today`
- Transition to `overdue`
- Create notification for workspace owner/manager
- Optionally send reminder email to customer (configurable in settings)

---

## 7. Credit Notes

When a paid invoice is refunded (partially or fully):

```
POST /api/workspaces/{w}/invoices/{id}/credit-note
Body: { items: [{invoice_item_id, quantity, amount}], reason }
```

Creates a `credit_notes` record linked to the original invoice. Generates `CN-0001` number. PDF: Credit Note template showing negative amounts, original invoice reference, reason.

```php
Schema::create('credit_notes', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('workspace_id');
    $table->uuid('invoice_id');
    $table->string('credit_note_number', 50);
    $table->decimal('amount', 15, 2);
    $table->text('reason')->nullable();
    $table->string('status', 50)->default('draft'); // draft|issued|applied
    $table->uuid('created_by');
    $table->timestampsTz();
    $table->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
});
```

---

## 8. Recurring Invoices

For subscriptions, retainers, or monthly services.

```php
Schema::create('recurring_invoices', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('workspace_id');
    $table->string('name'); // "Monthly Retainer — Acme"
    $table->string('frequency', 50); // daily|weekly|monthly|quarterly|yearly
    $table->integer('interval')->default(1); // every 1 month, every 2 weeks
    $table->date('next_run_date');
    $table->date('end_date')->nullable(); // null = runs forever
    $table->integer('remaining_occurrences')->nullable();
    $table->boolean('auto_send')->default(false);
    $table->boolean('is_active')->default(true);
    $table->uuid('customer_id')->nullable();
    $table->string('customer_name');
    $table->string('customer_email');
    $table->string('currency', 10)->default('USD');
    $table->integer('payment_terms_days')->default(30);
    $table->jsonb('line_items'); // snapshot of items to repeat
    $table->text('notes')->nullable();
    $table->uuid('last_invoice_id')->nullable();
    $table->timestampsTz();
    $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
});
```

Scheduled command: `php artisan invoices:generate-recurring`
- Finds all active recurring invoices where `next_run_date <= today`
- Creates invoice from template
- If `auto_send = true`: sends immediately
- Advances `next_run_date` by `interval × frequency`
- Decrements `remaining_occurrences` if set; deactivates when 0

---

## 9. PO → Inventory Receipt

When a Purchase Order is marked as "Received":

```
POST /api/workspaces/{w}/purchases/orders/{id}/receive
Body: { items: [{purchase_order_item_id, received_qty, lot_number, location, notes}] }
```

For each line item:
- Creates `stock_items` records in Inventory (one per unit or batch)
- Creates GRN PDF
- Updates PO status to `received` (or `partially_received` if short-shipped)
- Creates accounting journal: `DR Inventory Asset / CR Accounts Payable`

---

## 10. Approval Workflow

For POs above a configurable threshold (e.g. >$5,000), require manager approval before sending to supplier.

```php
// workspace.settings
"po_approval_threshold": 5000,
"so_approval_required": false,
"invoice_approval_required": false
```

When a PO/SO is submitted above threshold:
- Status = `pending_approval`
- Notification sent to all workspace managers
- Manager clicks "Approve" / "Reject" with optional comment
- Audit log records approval decision

---

## 11. Frontend Changes

### 11.1 Invoice Detail Panel

Add buttons:
- **Download PDF** (always)
- **Send Invoice** (when draft or sent)
- **Record Payment** (when sent/partially_paid/overdue) — opens payment modal
- **Copy Public Link** (when sent)
- **Create Credit Note** (when paid)
- **View Source SO** (when `sales_order_id` is set)

Payment history tab: list of all payments against this invoice.

### 11.2 Sales Order Detail Panel

Add buttons:
- **Download PDF** (always)
- **Send Quote** (when quotation)
- **Approve Order** (manager+ when quotation)
- **Convert to Invoice** (when confirmed, not yet fully invoiced)
- **Mark Shipped** (when confirmed) — prompts for carrier/tracking
- **Download Delivery Note** (when shipped/delivered)

### 11.3 Purchase Order Detail Panel

Add buttons:
- **Download PDF** (always)
- **Send to Supplier** (when draft)
- **Mark Received** (when confirmed) — opens receive items modal
- **Download GRN** (when received)

---

## 12. Open Questions

- Should Stripe Payment Links be embedded in the public invoice URL (Phase 1 or 2)?
- Multi-invoice per SO: select which line items to include in each invoice?
- When PO is received and stock is auto-created, what default status for stock items? (`in_stock`)
- Tax handling: compound tax (tax on tax)? Multiple tax rates per workspace?

---

## 13. Success Criteria

- [ ] Sequential numbers for all document types, configurable per workspace
- [ ] Quote → SO → Invoice → Payment → Receipt flow end-to-end
- [ ] PO → Received → GRN → Stock auto-created flow end-to-end
- [ ] `invoice_payments` table; partial payment handling; `amount_paid` tracking
- [ ] Overdue cron job transitions invoices daily
- [ ] Recurring invoices: create on schedule, optional auto-send
- [ ] Credit note creation and PDF generation
- [ ] Approval workflow for POs above threshold
- [ ] Tests: full workflow integration test; recurring invoice generation test
