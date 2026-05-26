# Document Templates & PDF Export

**Status:** ENHANCED DRAFT  
**Date:** 2026-05-25  
**Domain:** ERP / Documents

---

## 1. Problem Statement

Every invoice, quote, sales order, purchase order, delivery note, and receipt produced by Aquerii is currently a UI screen with no exportable artefact. Customers and suppliers expect professional PDF documents with the company's logo, address, VAT number, bank details, and consistent branding. Without this, Aquerii cannot be used as a primary business operations tool.

**Branding integration:** All PDF templates receive the workspace logo URL, brand colour, and selected layout template from `workspace.settings.doc_template`. Full branding spec is in `COMPANY_BRANDING.md`. This document focuses on document structure, numbering, and PDF generation mechanics.

**Three selectable layout templates:** Modern (accent colour band), Classic (formal horizontal rules), Minimal (white-space focused). Selected in Settings > Documents. All document types render in the chosen template.

---

## 2. Document Types & Numbers

| Document | Number Format | Example | Template Name |
|----------|--------------|---------|---------------|
| Quote | QT-{YYYY}-{NNNN} | QT-2026-0042 | `quote.blade.php` |
| Sales Order Confirmation | SO-{YYYY}-{NNNN} | SO-2026-0019 | `sales-order.blade.php` |
| Invoice (Tax Invoice) | INV-{YYYY}-{NNNN} | INV-2026-0115 | `invoice.blade.php` |
| Credit Note | CN-{YYYY}-{NNNN} | CN-2026-0003 | `credit-note.blade.php` |
| Purchase Order | PO-{YYYY}-{NNNN} | PO-2026-0031 | `purchase-order.blade.php` |
| Goods Receipt Note | GRN-{YYYY}-{NNNN} | GRN-2026-0008 | `grn.blade.php` |
| Payment Receipt | REC-{YYYY}-{NNNN} | REC-2026-0009 | `receipt.blade.php` |

All numbering is workspace-scoped, sequential, and locked via `document_sequences` table (see `INVOICE_PDF.md` §4 for `SequenceService`).

---

## 3. PDF Generation: Gotenberg

### 3.1 Why Gotenberg

- Docker sidecar: `gotenberg/gotenberg:8`
- Renders HTML via headless Chromium — pixel-perfect, supports CSS grid/flexbox, web fonts
- No PHP PDF library dependencies (no TCPDF/Dompdf quirks)
- Single endpoint: `POST /forms/chromium/convert/html`

### 3.2 Docker Service (add to `docker-compose.yml`)

```yaml
gotenberg:
  image: gotenberg/gotenberg:8
  restart: unless-stopped
  command:
    - "gotenberg"
    - "--chromium-disable-javascript=true"
    - "--chromium-allow-list=file:///.*"
  networks:
    - app-network
```

Add env var to API service:
```yaml
GOTENBERG_URL: http://gotenberg:3000
```

### 3.3 GotenbergService (Laravel)

```php
// app/Services/GotenbergService.php
class GotenbergService {
    public function htmlToPdf(string $html, array $options = []): string {
        $response = Http::attach('files', $html, 'index.html')
            ->post(config('services.gotenberg.url') . '/forms/chromium/convert/html', array_merge([
                'paperWidth'   => '210mm',
                'paperHeight'  => '297mm',
                'marginTop'    => '10mm',
                'marginBottom' => '15mm',
                'marginLeft'   => '15mm',
                'marginRight'  => '15mm',
            ], $options));

        if ($response->failed()) {
            throw new \RuntimeException('Gotenberg PDF conversion failed: ' . $response->body());
        }

        return $response->body(); // raw PDF bytes
    }
}
```

### 3.4 DocumentPdfService (orchestrator)

```php
// app/Services/DocumentPdfService.php
class DocumentPdfService {
    public function generate(string $type, Model $document): string {
        $workspace = $document->workspace;
        $html = view("pdf.{$type}", [
            'document'  => $document,
            'workspace' => $workspace,
            'settings'  => $workspace->settings,
        ])->render();

        return app(GotenbergService::class)->htmlToPdf($html);
    }

    public function store(string $type, Model $document): string {
        $pdf = $this->generate($type, $document);
        $path = "workspaces/{$document->workspace_id}/documents/{$type}/{$document->id}.pdf";
        Storage::disk('s3')->put($path, $pdf, 'private');
        return $path;
    }
}
```

---

## 4. Blade PDF Templates

Templates are organised in three directories matching the three layout choices. All share common partials.

**Directory structure:**
```
resources/views/pdf/
├── partials/
│   ├── logo.blade.php          ← logo img OR initials SVG avatar (see COMPANY_BRANDING.md §8.2)
│   └── totals.blade.php        ← shared totals/discount/tax block
├── modern/                     ← accent colour band, right-aligned totals
│   ├── layout.blade.php
│   ├── invoice.blade.php
│   ├── quote.blade.php
│   ├── sales-order.blade.php
│   ├── purchase-order.blade.php
│   ├── grn.blade.php
│   ├── receipt.blade.php
│   └── credit-note.blade.php
├── classic/                    ← centred header, horizontal rules
│   └── [same 7 files]
└── minimal/                    ← white-space, watermark number, hairline borders
    └── [same 7 files]
```

The `DocumentPdfService` selects the directory via `$workspace->settings['doc_template'] ?? 'modern'`.

### 4.1 Modern Master Layout `resources/views/pdf/modern/layout.blade.php`

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; font-size: 11px; color: #111; background: white; }
  .page { padding: 0; }
  
  /* Header */
  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .company-logo img { max-height: 56px; max-width: 160px; }
  .doc-title { font-size: 28px; font-weight: 700; color: var(--accent, #7c3aed); letter-spacing: -0.5px; }
  .doc-number { font-size: 13px; color: #555; margin-top: 4px; }
  
  /* Address blocks */
  .address-row { display: flex; gap: 40px; margin-bottom: 28px; }
  .address-block { flex: 1; }
  .address-block h4 { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-bottom: 6px; }
  .address-block p { line-height: 1.6; color: #222; }
  
  /* Line items table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #f4f4f8; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: #555; }
  thead th:last-child, td:last-child { text-align: right; }
  tbody td { padding: 9px 10px; border-bottom: 1px solid #f0f0f4; vertical-align: top; }
  tbody tr:last-child td { border-bottom: none; }
  
  /* Totals */
  .totals { float: right; width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
  .totals-row.total { border-top: 2px solid #111; margin-top: 4px; padding-top: 8px; font-size: 14px; font-weight: 700; }
  
  /* Footer */
  .doc-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px 15mm; font-size: 9px; color: #aaa; border-top: 1px solid #eee; display: flex; justify-content: space-between; }
  
  /* Status badge */
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
  .status-paid    { background: #d1fae5; color: #065f46; }
  .status-sent    { background: #dbeafe; color: #1e40af; }
  .status-overdue { background: #fee2e2; color: #991b1b; }
  .status-draft   { background: #f3f4f6; color: #374151; }
</style>
</head>
<body>
<div class="page">
  @yield('content')
</div>
<div class="doc-footer">
  <span>{{ $settings['company_name'] ?? $workspace->name }}</span>
  <span>{{ $settings['company_registration'] ?? '' }} · VAT: {{ $settings['vat_number'] ?? 'N/A' }}</span>
  <span class="page-number"></span>
</div>
</body>
</html>
```

### 4.2 Invoice Template `resources/views/pdf/invoice.blade.php`

Extends master layout. Sections:
1. Header: company logo (left) + "TAX INVOICE" title + number + status badge (right)
2. Meta row: issue date, due date, payment terms
3. Address blocks: "Bill From" (workspace), "Bill To" (customer)
4. Optional: public QR code linking to online invoice view
5. Line items table: Description · Qty · Unit Price · Discount · Tax % · Total
6. Totals block: Subtotal, Discount, Tax, **Total**, Amount Paid, **Amount Due**
7. Notes
8. Bank details (if `settings.bank_details` set)
9. Footer: company reg, VAT, page number

### 4.3 Quote Template

Same as invoice except:
- Title: "QUOTATION" not "TAX INVOICE"
- No VAT number or "tax invoice" language
- Extra field: "Valid Until" date
- CTA at bottom: "To accept this quote, please contact us at {email}"
- Watermark option: "DRAFT" (if status = draft)

### 4.4 Sales Order Confirmation

Title: "ORDER CONFIRMATION" — `SO-2026-0019`  
Shows: PO number from customer (if provided), delivery address, expected delivery date, incoterms.

### 4.5 Purchase Order

Title: "PURCHASE ORDER" — `PO-2026-0031`  
Shows: delivery address (warehouse), expected delivery date, payment terms to supplier, special instructions.

### 4.6 Goods Receipt Note (GRN)

Title: "GOODS RECEIPT NOTE" — `GRN-2026-0008`  
Shows: linked PO number, received by (user name), received date, items with received qty vs ordered qty, any discrepancies noted.

### 4.7 Payment Receipt

Title: "PAYMENT RECEIPT" — `REC-2026-0009`  
Shows: linked invoice number, payment date, amount received, payment method, reference, balance due (if partial).

### 4.8 Credit Note

Title: "CREDIT NOTE" — `CN-2026-0003`  
Shows: original invoice number, reason for credit, list of credited items, credit total. Uses red accent colour for negative amounts.

---

## 5. API Endpoints

```
GET  /api/workspaces/{w}/invoices/{id}/pdf           → download PDF (generates on-the-fly)
GET  /api/workspaces/{w}/sales/orders/{id}/pdf       → SO/Quote PDF
GET  /api/workspaces/{w}/purchases/orders/{id}/pdf   → PO PDF
GET  /api/workspaces/{w}/purchases/grns/{id}/pdf     → GRN PDF
GET  /api/workspaces/{w}/invoices/{id}/receipts/{rid}/pdf → Payment Receipt PDF
GET  /api/workspaces/{w}/invoices/{id}/credit-notes/{cid}/pdf → Credit Note PDF

# Public (no auth — uses public_token)
GET  /public/invoices/{token}        → HTML invoice view (for client)
GET  /public/invoices/{token}/pdf    → PDF download (for client)
```

PDF endpoints: stream the PDF with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="{number}.pdf"`.

---

## 6. Template Customisation (Settings > Documents)

Workspace settings panel for document branding:

```
Settings > Documents
├── Company Logo (upload, stored in S3, shows preview)
├── Brand Colour (hex picker — used as accent on PDFs)
├── Company Name / Address / VAT / Registration Number
├── Bank Details (multi-line text for wire transfer instructions)
├── Invoice Terms (default text shown at bottom of invoices)
├── Quote Footer Message
├── Payment Terms (default days: 7 / 14 / 30 / 60)
├── Document Numbering
│   ├── Invoice prefix (default: INV) + starting number
│   ├── Quote prefix (default: QT) + starting number
│   ├── PO prefix (default: PO) + starting number
│   └── Reset numbering annually? (toggle)
└── Preview PDF Button (generates sample PDF with current settings)
```

Settings stored in `workspace.settings` JSONB:
```json
{
  "company_name": "Acme Corp",
  "company_address": "1 Main St\nJohannesburg, 2001",
  "vat_number": "VAT-123456",
  "company_registration": "2010/123456/07",
  "bank_details": "Bank: FNB\nAccount: 62123456\nBranch: 201909",
  "brand_colour": "#7c3aed",
  "logo_path": "workspaces/xxx/logo.png",
  "invoice_terms": "Payment due within 30 days.",
  "quote_footer": "This quote is valid for 14 days.",
  "payment_terms_days": 30,
  "doc_number_reset_annually": true,
  "doc_prefix_invoice": "INV",
  "doc_prefix_quote": "QT",
  "doc_prefix_po": "PO"
}
```

---

## 7. Email Delivery with PDF Attachment

On "Send Invoice" action:
```php
// InvoiceMailer.php
Mail::to($invoice->customer_email)
    ->send(new InvoiceMail($invoice, $pdfBytes));

// InvoiceMail.php
public function build(): static {
    return $this->subject("Invoice {$this->invoice->invoice_number} from {$this->workspaceName}")
        ->markdown('emails.invoice')
        ->attachData($this->pdfBytes, "{$this->invoice->invoice_number}.pdf", [
            'mime' => 'application/pdf',
        ]);
}
```

Email template (`emails/invoice.blade.php`) shows: amount due, due date, "Pay Online" button (links to public invoice URL if enabled), contact info.

---

## 8. Frontend: Download & Send Buttons

Add to detail panels and list row action menus:

```tsx
// In InvoiceDetailPanel
<Button variant="outline" onClick={() => downloadPdf('invoices', id)}>
  <Download size={14} /> Download PDF
</Button>
<Button onClick={() => sendInvoice(id)}>
  <Send size={14} /> Send Invoice
</Button>

// downloadPdf helper
const downloadPdf = async (resource: string, id: string) => {
  const url = `/api/workspaces/${workspaceId}/${resource}/${id}/pdf`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${resource}-${id}.pdf`;
  a.click();
};
```

---

## 9. Open Questions

- Should we cache PDFs in S3 after first generation (and invalidate on edit) or always generate on-the-fly?
- Multi-page documents: should Gotenberg page numbers use built-in paged media CSS (`@page`) or a custom footer?
- Digital signature / e-stamp on invoices (Phase 2)?

---

## 10. Success Criteria

- [ ] `gotenberg` Docker service in `docker-compose.yml`; `GOTENBERG_URL` env var
- [ ] `GotenbergService` and `DocumentPdfService` implemented
- [ ] `SequenceService` generates sequential numbers for all 7 document types
- [ ] All 7 Blade PDF templates render correctly (with logo, brand colour, address, line items, totals)
- [ ] Download PDF button on: Invoice, Quote, SO, PO, GRN, Receipt, Credit Note detail views
- [ ] "Send Invoice/Quote" emails PDF as attachment via BillionMail SMTP
- [ ] Public invoice link: `/public/invoices/{token}` renders HTML; `/pdf` streams PDF
- [ ] Settings > Documents panel: logo upload, VAT, bank details, numbering prefix, preview PDF
- [ ] Tests: `SequenceService` locking test; `DocumentPdfService` integration (Gotenberg mock); PDF download endpoint test
