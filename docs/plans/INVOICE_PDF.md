# Invoice PDF Export & Document Templates

**Status:** ENHANCED DRAFT  
**Date:** 2026-05-25  
**Domain:** ERP / Invoicing / Documents

---

## 1. Problem Statement

Aquerii's ERP modules create structured data (invoices, quotes, purchase orders, sales orders, receipts) but cannot produce any printable or shareable output. This is a hard blocker for commercial use. Every business needs to:
- Download a professional PDF of an invoice and send it to a client
- Email an invoice directly from the system
- Print a purchase order to send to a supplier
- Give customers a public link to view and download their invoice
- Brand all documents with their company logo and colours

Additionally, there is no sequential numbering system — order numbers are random strings — making documents unprofessional and hard to reference.

---

## 2. Document Types Covered

| Document | Module | Triggers |
|----------|--------|---------|
| **Invoice** | Invoicing | Created invoice, status = sent |
| **Quote / Proforma** | Sales | SO status = quotation |
| **Sales Order Confirmation** | Sales | SO status = confirmed |
| **Delivery Note** | Sales | SO status = shipped |
| **Purchase Order** | Purchasing | PO status = sent |
| **Goods Receipt Note (GRN)** | Purchasing | PO status = received |
| **Payment Receipt** | Invoicing | Invoice status = paid |
| **Credit Note** | Invoicing | Invoice voided after partial/full payment |

---

## 3. Sequential Numbering System

Current numbering is `INV-` + timestamp suffix (unprofessional). Replace with:

### 3.1 Database

```php
// Migration: add sequence tables
Schema::create('document_sequences', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('workspace_id');
    $table->string('document_type', 50); // invoice|quote|sales_order|purchase_order|receipt|credit_note
    $table->string('prefix', 20)->default(''); // INV-, SO-, PO-, QT-, RCP-, CN-
    $table->string('suffix', 20)->default('');
    $table->integer('next_number')->default(1);
    $table->integer('padding', 2)->default(4); // zero-pad to 4 digits
    $table->string('reset_period', 20)->default('never'); // never|yearly|monthly
    $table->integer('year')->nullable(); // current year for yearly reset
    $table->unique(['workspace_id', 'document_type']);
    $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
});
```

### 3.2 Sequence Service

```php
class SequenceService {
    public function next(Workspace $workspace, string $type): string {
        return DB::transaction(function () use ($workspace, $type) {
            $seq = DocumentSequence::lockForUpdate()
                ->firstOrCreate(
                    ['workspace_id' => $workspace->id, 'document_type' => $type],
                    ['prefix' => $this->defaultPrefix($type), 'next_number' => 1]
                );
            
            // Handle yearly reset
            if ($seq->reset_period === 'yearly' && $seq->year !== now()->year) {
                $seq->next_number = 1;
                $seq->year = now()->year;
            }
            
            $number = $seq->prefix . str_pad($seq->next_number, $seq->padding, '0', STR_PAD_LEFT) . $seq->suffix;
            $seq->increment('next_number');
            return $number;
        });
    }
}
```

Default prefixes: `INV-`, `QT-`, `SO-`, `PO-`, `RCP-`, `CN-`, `GRN-`
Example output: `INV-0042`, `SO-2026-0001` (yearly prefix), `PO-00123`

---

## 4. PDF Generation Engine

### 4.1 Recommended Approach: Gotenberg

**Why:** Gotenberg wraps Chromium in a Docker container accessible via HTTP API. It produces pixel-perfect PDFs from HTML/CSS with full CSS3 support, keeps the API container lean, and is horizontally scalable.

```yaml
# docker-compose.yml addition
gotenberg:
  image: gotenberg/gotenberg:8
  restart: unless-stopped
  networks: [aquerii]
  command:
    - "gotenberg"
    - "--chromium-disable-javascript=true"
    - "--chromium-allow-list=file:///tmp/.*"
```

Add to `services/api/config/services.php`:
```php
'gotenberg' => ['url' => env('GOTENBERG_URL', 'http://gotenberg:3000')],
```

### 4.2 PdfService

```php
// app/Services/PdfService.php
class PdfService {
    public function render(string $view, array $data, array $options = []): string {
        $html = view($view, $data)->render();
        
        $response = Http::attach('files', $html, 'index.html')
            ->post(config('services.gotenberg.url') . '/forms/chromium/convert/html', array_merge([
                'paperWidth'   => '8.27',
                'paperHeight'  => '11.69',
                'marginTop'    => '0.5',
                'marginBottom' => '0.5',
                'marginLeft'   => '0.5',
                'marginRight'  => '0.5',
            ], $options));
        
        if ($response->failed()) {
            throw new \RuntimeException('PDF generation failed: ' . $response->body());
        }
        
        return $response->body();
    }
    
    public function invoicePdf(Invoice $invoice): string {
        return $this->render('pdfs.invoice', [
            'invoice'   => $invoice->load('items', 'workspace', 'customer'),
            'workspace' => $invoice->workspace,
        ]);
    }
    
    public function salesOrderPdf(SalesOrder $order): string {
        return $this->render('pdfs.sales-order', compact('order'));
    }
    
    public function purchaseOrderPdf(PurchaseOrder $order): string {
        return $this->render('pdfs.purchase-order', compact('order'));
    }
    
    public function quotePdf(SalesOrder $quote): string {
        return $this->render('pdfs.quote', compact('quote'));
    }
    
    public function goodsReceiptPdf(PurchaseOrder $order): string {
        return $this->render('pdfs.goods-receipt', compact('order'));
    }
    
    public function receiptPdf(Invoice $invoice): string {
        return $this->render('pdfs.receipt', compact('invoice'));
    }
}
```

---

## 5. Blade PDF Templates

All templates live in `services/api/resources/views/pdfs/`. They share a master layout.

### 5.1 Shared Master Layout: `pdfs/layout.blade.php`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; font-size: 11pt; color: #1a1a2e; line-height: 1.5; }
    
    .page { padding: 40px; min-height: 100vh; display: flex; flex-direction: column; }
    
    /* Header */
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .doc-logo { max-height: 56px; max-width: 180px; object-fit: contain; }
    .doc-title { font-size: 28pt; font-weight: 700; color: var(--accent, #7c3aed); text-align: right; }
    .doc-number { font-size: 11pt; color: #666; text-align: right; margin-top: 4px; }
    
    /* Meta grid */
    .doc-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .doc-meta-section h4 { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-bottom: 6px; }
    .doc-meta-section p { font-size: 10pt; color: #333; }
    
    /* Dates */
    .doc-dates { display: flex; gap: 32px; margin-bottom: 28px; padding: 16px; background: #f8f9fc; border-radius: 6px; }
    .doc-date-item label { font-size: 8pt; color: #999; text-transform: uppercase; letter-spacing: 0.06em; display: block; }
    .doc-date-item span { font-size: 11pt; font-weight: 600; color: #1a1a2e; }
    
    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: var(--accent, #7c3aed); color: white; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 12px; text-align: left; }
    thead th:last-child, thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
    tbody tr:nth-child(even) { background: #f8f9fc; }
    tbody td { padding: 10px 12px; font-size: 10pt; border-bottom: 1px solid #e8eaf0; }
    tbody td:last-child, tbody td:nth-child(3), tbody td:nth-child(4) { text-align: right; }
    
    /* Totals */
    .doc-totals { width: 280px; margin-left: auto; }
    .doc-totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 10pt; border-bottom: 1px solid #e8eaf0; }
    .doc-totals-row.total { font-size: 13pt; font-weight: 700; color: var(--accent, #7c3aed); border-bottom: none; padding-top: 12px; }
    
    /* Status badge */
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-draft { background: #f3f4f6; color: #6b7280; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    
    /* Footer */
    .doc-footer { margin-top: auto; padding-top: 24px; border-top: 1px solid #e8eaf0; font-size: 9pt; color: #888; }
    .doc-notes { margin-bottom: 24px; padding: 16px; background: #fffbeb; border-left: 3px solid #f59e0b; }
    .doc-notes h4 { font-size: 9pt; font-weight: 600; margin-bottom: 6px; }
    
    @media print { .page { padding: 20px; } }
  </style>
  <style>
    :root { --accent: {{ $workspace->settings['brand_color'] ?? '#7c3aed' }}; }
  </style>
</head>
<body>
<div class="page">
  @yield('content')
</div>
</body>
</html>
```

### 5.2 Invoice Template: `pdfs/invoice.blade.php`

```html
@extends('pdfs.layout')
@section('content')
<div class="doc-header">
  <div>
    @if($workspace->logo_url)
      <img src="{{ $workspace->logo_url }}" class="doc-logo" alt="{{ $workspace->name }}">
    @else
      <div style="font-size: 18pt; font-weight: 700;">{{ $workspace->name }}</div>
    @endif
    <div style="font-size: 9pt; color: #666; margin-top: 6px;">
      {{ $workspace->settings['address'] ?? '' }}<br>
      VAT: {{ $workspace->settings['vat_number'] ?? '' }}
    </div>
  </div>
  <div>
    <div class="doc-title">INVOICE</div>
    <div class="doc-number">{{ $invoice->invoice_number }}</div>
    <div style="margin-top: 8px;">
      <span class="status-badge status-{{ $invoice->status }}">{{ strtoupper($invoice->status) }}</span>
    </div>
  </div>
</div>

<div class="doc-meta">
  <div class="doc-meta-section">
    <h4>Bill To</h4>
    <p><strong>{{ $invoice->customer_name }}</strong></p>
    <p>{{ $invoice->customer_email }}</p>
    @if($invoice->billing_address)
      <p style="white-space: pre-line;">{{ $invoice->billing_address }}</p>
    @endif
  </div>
  <div class="doc-meta-section">
    <div class="doc-dates">
      <div class="doc-date-item">
        <label>Issue Date</label>
        <span>{{ \Carbon\Carbon::parse($invoice->issue_date)->format('d M Y') }}</span>
      </div>
      <div class="doc-date-item">
        <label>Due Date</label>
        <span>{{ \Carbon\Carbon::parse($invoice->due_date)->format('d M Y') }}</span>
      </div>
    </div>
    @if($invoice->paid_at)
    <div class="doc-date-item" style="padding: 12px; background: #d1fae5; border-radius: 6px; margin-top: 8px;">
      <label>Paid On</label>
      <span>{{ \Carbon\Carbon::parse($invoice->paid_at)->format('d M Y') }}</span>
    </div>
    @endif
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Description</th>
      <th>Qty</th>
      <th>Unit Price</th>
      <th>Tax %</th>
      <th>Amount</th>
    </tr>
  </thead>
  <tbody>
    @foreach($invoice->items as $i => $item)
    <tr>
      <td>{{ $i + 1 }}</td>
      <td>{{ $item->description }}</td>
      <td>{{ $item->quantity }}</td>
      <td>{{ $invoice->currency }} {{ number_format($item->unit_price, 2) }}</td>
      <td>{{ $item->tax_rate }}%</td>
      <td>{{ $invoice->currency }} {{ number_format($item->total, 2) }}</td>
    </tr>
    @endforeach
  </tbody>
</table>

<div class="doc-totals">
  <div class="doc-totals-row"><span>Subtotal</span><span>{{ $invoice->currency }} {{ number_format($invoice->subtotal, 2) }}</span></div>
  @if($invoice->tax_total > 0)
  <div class="doc-totals-row"><span>Tax</span><span>{{ $invoice->currency }} {{ number_format($invoice->tax_total, 2) }}</span></div>
  @endif
  @if(($invoice->discount_amount ?? 0) > 0)
  <div class="doc-totals-row" style="color: #059669;"><span>Discount</span><span>-{{ $invoice->currency }} {{ number_format($invoice->discount_amount, 2) }}</span></div>
  @endif
  <div class="doc-totals-row total"><span>TOTAL DUE</span><span>{{ $invoice->currency }} {{ number_format($invoice->total, 2) }}</span></div>
</div>

@if($invoice->notes)
<div class="doc-notes" style="margin-top: 24px;">
  <h4>Notes</h4>
  <p>{{ $invoice->notes }}</p>
</div>
@endif

<div class="doc-footer">
  <div style="display: flex; justify-content: space-between;">
    <div>
      <strong>Payment Details</strong><br>
      {{ $workspace->settings['bank_details'] ?? '' }}
    </div>
    <div style="text-align: right;">
      {{ $workspace->settings['payment_terms_text'] ?? '' }}
    </div>
  </div>
  <div style="margin-top: 12px; text-align: center; font-size: 8pt;">
    Thank you for your business · {{ $workspace->name }} · {{ $workspace->settings['email'] ?? '' }}
  </div>
</div>
@endsection
```

### 5.3 Quote Template: `pdfs/quote.blade.php`
Identical to invoice but:
- Title: "QUOTATION" (or "PROFORMA INVOICE")
- Status badge: "DRAFT" / "SENT"
- No "Due Date" — show "Valid Until" (issue_date + 30 days)
- Footer: "This is not a tax invoice. Subject to change."

### 5.4 Purchase Order Template: `pdfs/purchase-order.blade.php`
- Title: "PURCHASE ORDER"
- "From" section: workspace (buyer) details
- "To" section: supplier name, email, address
- Table: same as invoice with "Ordered Qty" instead of "Qty"
- Footer: delivery address, payment terms, authorised signature line

### 5.5 Sales Order Confirmation: `pdfs/sales-order.blade.php`
- Title: "ORDER CONFIRMATION"
- Shows shipping address
- Status: "CONFIRMED"
- Table: items with quantities
- Footer: expected delivery date, tracking info placeholder

### 5.6 Goods Receipt Note: `pdfs/goods-receipt.blade.php`
- Title: "GOODS RECEIPT NOTE"
- Reference: GRN-XXXX linked to PO-XXXX
- Table: Description, PO Qty, Received Qty, Condition
- Signature line for receiving employee

### 5.7 Payment Receipt: `pdfs/receipt.blade.php`
- Title: "PAYMENT RECEIPT"
- Show: Amount Paid, Payment Date, Payment Method, Invoice Reference
- Large green "PAID IN FULL" stamp (CSS `transform: rotate(-15deg)`)

---

## 6. PDF API Endpoints

```php
// All return PDF bytes with Content-Disposition: attachment

GET /api/workspaces/{w}/invoices/{id}/pdf
GET /api/workspaces/{w}/invoices/{id}/receipt-pdf     // after paid_at is set
GET /api/workspaces/{w}/invoices/{id}/preview-html    // dev/design preview in browser
GET /api/workspaces/{w}/sales/orders/{id}/pdf         // order confirmation
GET /api/workspaces/{w}/sales/orders/{id}/quote-pdf   // when status = quotation
GET /api/workspaces/{w}/sales/orders/{id}/delivery-pdf
GET /api/workspaces/{w}/purchases/orders/{id}/pdf
GET /api/workspaces/{w}/purchases/orders/{id}/grn-pdf // when status = received
```

Public (no auth, token-based):
```
GET /public/invoices/{token}/view   // HTML view for client
GET /public/invoices/{token}/pdf    // PDF download for client
```

### 6.1 Public Invoice Link

```php
Schema::table('invoices', function (Blueprint $table) {
    $table->string('public_token', 64)->nullable()->unique()->after('notes');
    $table->boolean('public_link_enabled')->default(false)->after('public_token');
});

// Controller:
public function generatePublicLink(Invoice $invoice): JsonResponse {
    $token = Str::random(48);
    $invoice->update(['public_token' => $token, 'public_link_enabled' => true]);
    return response()->json(['url' => route('invoices.public', $token)]);
}
```

The public view shows a read-only, beautifully styled invoice page with a "Download PDF" button. No login required.

---

## 7. Email Invoice Delivery

### 7.1 InvoiceMail Mailable

```php
// app/Mail/InvoiceMail.php
class InvoiceMail extends Mailable {
    public function __construct(
        public Invoice $invoice,
        public string $pdfBytes,
        public string $message = ''
    ) {}
    
    public function content(): Content {
        return new Content(view: 'emails.invoice');
    }
    
    public function attachments(): array {
        return [
            Attachment::fromData(fn () => $this->pdfBytes, $this->invoice->invoice_number . '.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
```

### 7.2 Email Template: `resources/views/emails/invoice.blade.php`

Responsive HTML email:
- Header with logo
- "You have received an invoice from [Workspace]"
- Invoice summary card (number, amount, due date)
- CTA button: "View Invoice Online" (→ public link) + "Download PDF"
- Payment instructions
- Footer with unsubscribe-like disclaimer

### 7.3 "Send Invoice" Flow

Frontend sends: `POST /api/workspaces/{w}/invoices/{id}/send` with optional `{ message: "..." }`.

Backend:
1. Generate PDF via PdfService
2. Update invoice status to `sent`
3. Set `public_link_enabled = true`, generate `public_token`
4. Dispatch `SendInvoiceJob` (queued) → sends InvoiceMail
5. Log audit event: `invoice.sent`
6. Return `{ public_url, sent_at }`

---

## 8. Print Button (Browser Print)

For quick printing without PDF generation overhead, expose a print-optimised HTML view:

```tsx
// Frontend: printDocument(url)
function printDocument(previewUrl: string) {
  const win = window.open(previewUrl, '_blank', 'width=800,height=900')
  win?.addEventListener('load', () => win.print())
}
```

Add `@media print` CSS rules to all Blade templates for direct browser printing as a fallback.

---

## 9. Template Customisation (Phase 2)

Allow workspace owners to customise document templates:
- Upload company logo (stored in S3/MinIO)
- Set brand colour (CSS variable override)
- Customise header/footer text
- Choose from 3 layout styles: Classic, Modern, Minimal
- Preview template live before saving

Stored in `workspace.settings`:
```json
{
  "doc_template": "modern",
  "brand_color": "#7c3aed",
  "logo_url": "https://...",
  "address": "123 Main St\nCity, Country",
  "vat_number": "VAT-12345678",
  "bank_details": "Bank: FNB\nAccount: 12345678",
  "payment_terms_text": "Payment due within 30 days",
  "invoice_footer": "Thank you for your business!",
  "email": "billing@company.com"
}
```

---

## 10. Settings > Documents Section (new)

Under Settings > General, add "Document Settings" panel:
- Company address (multiline)
- VAT/Tax number
- Bank details (for invoice footer)
- Default payment terms (days)
- Invoice/PO/SO number format (prefix, padding, reset period)
- Upload company logo
- Brand colour picker

---

## 11. Discount Fields (ERP Schema Addition)

All three order types currently lack discount fields. Add:

```php
// Migration: add discount to invoices, sales_orders, purchase_orders
$table->decimal('discount_amount', 15, 2)->default(0)->after('subtotal');
$table->string('discount_type', 20)->default('fixed'); // 'fixed' | 'percent'
$table->decimal('discount_value', 10, 4)->default(0)->after('discount_type');
// discount_amount is computed: if percent, = subtotal * (discount_value/100)
```

Also add per-line discount:
```php
// invoice_items, sales_order_items, purchase_order_items
$table->decimal('discount_percent', 5, 2)->default(0)->after('tax_rate');
```

---

## 12. Open Questions

- Should PDFs be cached in S3 after first generation, or always re-rendered?
- Should the public invoice link require the client to enter their email to download?
- Payment gateway integration (Stripe Payment Links on invoice) — Phase 1 or 2?
- Support for A4 and US Letter paper sizes?

---

## 13. Success Criteria

- [ ] Sequential numbering for all document types; configurable prefix/padding in settings
- [ ] All 7 PDF templates render correctly via Gotenberg
- [ ] "Download PDF" button on invoice, SO, PO, quote, GRN, receipt detail views
- [ ] "Send Invoice" endpoint generates PDF, emails client, sets status, creates public link
- [ ] Public invoice URL accessible without login; shows payment instructions
- [ ] Discount fields added to invoices, SOs, POs with correct PDF rendering
- [ ] Print button opens browser print dialog with print-optimised layout
- [ ] Document settings panel in workspace settings
- [ ] Tests: PDF generation smoke test; sequence number uniqueness under concurrency
