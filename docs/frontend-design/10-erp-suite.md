# 10 — ERP Suite

## Layout: ERPLayout

A sub-layout injected below the main AppShell sidebar. Adds a horizontal tab bar under the global header for ERP module navigation.

```
┌─────────────────────────────────────────────────────┐
│  [AppShell Header]                                   │
├─────────────────────────────────────────────────────┤
│  [Sales] [Purchasing] [Invoicing] [Inventory] [Acct] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  <Module Content>                                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Route structure

```
/erp/sales          → SalesPage
/erp/purchasing     → PurchasingPage
/erp/invoicing      → InvoicingPage
/erp/inventory      → InventoryPage
/erp/accounting     → AccountingPage
```

Active tab gets an underline + primary color fill. Tab click updates URL and prefetches list data.

---

## Shared Components

### StatusBadge
- Maps backend status strings to semantic colors.
- background: light tint, text: full color, dot indicator left of text.
- Color map: draft=gray, confirmed=sent=blue, shipped=received=purple, delivered=paid=green, overdue=cancelled=refunded=red.
- Badge has subtle border, 14px font, 4px border-radius.

### CurrencyCell
- Formats number to locale string with 2 decimals and symbol prefix.
- Accepts `currency` prop (defaults to USD).
- Red text for negative values.

### DateCell
- Uses dayjs for formatting.
- Default: "MMM D, YYYY" with full date tooltip on hover.

### LoadingSkeleton
- Faux table rows: 5 rows of animated pulse bars.
- Faux detail panel: 3 stacked rectangles.
- Used on every list and detail view during data fetch.

### EmptyState
- 120px illustration (per-module: invoice doc, box, chart, etc.)
- Title + subtitle string props.
- Optional CTA button to create first entity.

### ErrorState
- Red-tinted box with error icon and message.
- Retry button that re-fetches from the stale query cache.

---

## InvoicingPage

### State machine supported by backend
```
draft → sent → paid → refunded
  ↓       ↓
cancelled cancelled
          ↓
        overdue (auto via GET response, no manual setter)
```

Backend fully implements GET/POST /api/invoices, GET/PUT/DELETE .../{id}, GET .../{id}/pdf, POST .../{id}/payments. All operations are available.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Invoices                              [+ New Invoice]       │
├──────────────────────────────────────────────────────────────┤
│  [All] [Draft] [Sent] [Paid] [Overdue] [Cancelled]           │
├─────────┬────────────────────────────────────────────────────┤
│  Filters │  Invoice Table                                     │
│  Date    │  # | Customer | Status | Amount | Due | Actions    │
│  Range   │  ──────────────────────────────────────────────   │
│  Status  │  INV-001 | Acme Corp | ● Sent  | $1,200 | 05/15 │ │
│  Search  │  INV-002 | Beta Inc  | ● Paid  | $3,400 | 04/30 │ │
│          │  ...                                              │
└─────────┴────────────────────────────────────────────────────┘
```

### Filter bar
- Tabs for each status: all/draft/sent/paid/overdue/cancelled. Active tab underlined with primary.
- Right side: date range picker (start/end), text search input with debounce.
- URL query params persist filter state on refresh.

### Invoice table columns
- Checkbox (select for bulk): invoice number (link to detail), customer name, status badge, total (currency), due date, actions dropdown.
- Actions: View, Download PDF, Record Payment, Send (if draft), Cancel (if draft/sent/paid).
- Pagination: 25 per page, page controls at bottom.

### Create Invoice Modal (full-screen slide-over)
- Form sections:
  1. **Header**: Customer (autocomplete dropdown from contacts, with "Create New" option), Invoice Date (date picker), Due Date, Reference number (auto-generated or manual override).
  2. **Line Items**: Dynamic row table. Each row: Product (autocomplete), Description (text), Quantity (number), Unit Price (currency), Tax Rate (dropdown: 0/5/10/20%), Line Total (computed read-only).
    - "Add Line Item" button at bottom of rows.
    - Row delete with confirmation if row has data.
    - Running subtotal, tax total, grand total footer below table.
  3. **Footer**: Notes (textarea), Terms (textarea), Discount (%) optional.
- Validation: at least 1 line item, quantity > 0, unit_price ≥ 0, customer required.
- Zod schema on frontend. Backend 422 errors mapped to form fields.
- Submit POST /api/invoices. On success: close modal, invalidate list query, show success toast.

### Invoice Detail Drawer (right side, 50% width)
- Rendered when row is clicked.
- Sections: Header (number, status badge, dates), Customer card, Line Items table (read-only), Totals footer, Payment History (if any payments recorded).
- Actions bar at top: Download PDF, Record Payment, Status Transition buttons (conditional on current status).
- PDF download: triggers GET /api/invoices/{id}/pdf, opens in new tab via blob URL.

### Record Payment (nested modal)
- Fields: Amount (currency, pre-filled with remaining balance), Payment Date, Payment Method (dropdown: bank transfer/credit card/cash/check), Reference, Notes.
- Submit POST /api/invoices/{id}/payments.
- On success: refresh drawer, update payment history, transition status to "paid" if full amount covered.

---

## PurchasingPage

Backend fully implements GET/POST /api/purchase-orders, GET/PUT/DELETE .../{id}. No gaps.

### Status transitions
```
draft → sent → confirmed → received → cancelled
```

### Layout — Identical structure to InvoicingPage

Status filter tabs: All, Draft, Sent, Confirmed, Received, Cancelled.
Table: PO #, Vendor, Status, Total, Expected Date, Actions.

### Create Purchase Order Modal
- Fields: Vendor (autocomplete), Order Date, Expected Delivery Date, Reference.
- Line items table (same pattern as invoice): Product, Description, Quantity, Unit Price, Tax, Total.
- Footer: Subtotal, Tax Total, Grand Total, Notes, Terms.
- Submit POST /api/purchase-orders.

### Detail Drawer
- Header (PO number, status, vendor), Line Items, Totals.
- Status transition buttons: Send (draft→sent), Confirm Receipt (sent→confirmed), Mark Received (confirmed→received), Cancel.

---

## SalesPage

Backend fully implements GET/POST /api/sales-orders, GET/PUT/DELETE .../{id}. No gaps.

### Status transitions
```
draft → confirmed → shipped → delivered → cancelled
```

### Layout — Identical to PurchasingPage with different labels

Status filter tabs: All, Draft, Confirmed, Shipped, Delivered, Cancelled.
Table: SO #, Customer, Status, Total, Order Date, Actions.

### Create Sales Order Modal
- Same line-item pattern as PO/Invoice.
- Fields: Customer, Order Date, Delivery Date, Shipping Address.
- Submit POST /api/sales-orders.

### Detail Drawer
- Header, Customer info, Line Items, Totals.
- Status buttons: Confirm (draft→confirmed), Mark Shipped (confirmed→shipped), Mark Delivered (shipped→delivered), Cancel.

---

## InventoryPage

### 3-panel layout

```
┌──────────────┬──────────────────────────┬──────────────────────┐
│  Categories  │  Products                │  Stock Items          │
│              │                          │                       │
│  [All]       │  Product Table           │  Lot/Serial Tracking  │
│  Raw Mat.    │  Name | SKU | Qty | Price│  Lot # | Qty | Loc   │
│  Finished    │  ──────────────────────  │  ─────────────────── │
│  Packaging   │  Widget | WDG-001 | 120   │  L2204 | 50 | A-12   │
│  + Add Cat   │  ...                     │  ...                  │
│              │  [+ Add Product]         │  [+ Add Stock]        │
└──────────────┴──────────────────────────┴──────────────────────┘
```

Backend fully supports GET/POST /api/inventory/categories, GET/PUT/DELETE .../{categoryId}, GET/POST /api/inventory/products, GET/PUT/DELETE .../{productId}, GET/POST /api/products/{productId}/stock-items, GET/PUT/DELETE .../{stockItemId}. All CRUD operations are available.

### Categories Panel (left, 220px)
- Scrollable list of categories with active highlight.
- "All" at top shows all products.
- Inline add button (+) opens mini form: name input + color swatch.
- Right-click or "..." menu: Rename, Delete (with confirmation if products exist under category).
- Active category filters product list via query param.

### Products Panel (center, flexible)
- Table: Thumbnail placeholder, Name, SKU, Barcode, Quantity (sum of stock items), Price (currency), Cost, Unit, Category, Actions.
- Actions: Edit, View Stock, Delete.
- **Add Product modal** (slide-over):
  - Fields: Name*, SKU*, Barcode, Description (textarea), Price*, Cost, Unit (dropdown: pcs/kg/m/hr), Category (dropdown from categories list), Image upload (drag-drop, preview).
  - Validation: name, SKU, price required. SKU uniqueness warned client-side if debounced check returns conflict.
- **Edit Product**: Pre-filled same form, PUT /api/inventory/products/{productId}.

### Stock Panel (right, 400px)
- Visible when a product is selected in the product table.
- Header: Product name + total quantity badge.
- Table: Lot Number, Serial Number, Quantity, Location (string, e.g. "A-12-B"), Expiry Date, Actions.
- Actions: Edit, Delete.
- **Add Stock Item modal**:
  - Fields: Lot Number* (text), Serial Number (text, optional), Quantity* (number > 0), Location* (text), Expiry Date (date picker, optional).
  - Validation: lot_number, quantity, location required.
  - Submit POST /api/products/{productId}/stock-items.
- **Edit Stock Item**: Same form, pre-filled, PUT .../{stockItemId}.

---

## AccountingPage

Backend fully implements GET/POST /api/accounts, GET/PUT/DELETE .../{id}, GET/POST /api/journal-entries, double-entry with balance validation on backend. No gaps.

### Two sub-tabs: "Chart of Accounts" | "Journal"

### Chart of Accounts

```
┌────────────────────────────────────────────────────────────────┐
│  Chart of Accounts                              [+ Add Account] │
├────────────────────────────────────────────────────────────────┤
│  Search accounts...                                             │
├─────────┬────────────┬────────┬──────────────┬─────────────────┤
│  Code   │  Name       │  Type  │  Balance     │  Actions        │
│  1000   │  Cash       │ Asset  │  $25,000.00  │  [Edit] [Del]   │
│  2000   │  AP         │ Liab   │  $12,000.00  │  [Edit] [Del]   │
│  3000   │  Revenue    │ Equity │  $50,000.00  │  [Edit] [Del]   │
│  4000   │  COGS       │ Expense│  $30,000.00  │  [Edit] [Del]   │
└─────────┴────────────┴────────┴──────────────┴─────────────────┘
```

- Table: Code, Name, Type (badge), Balance (currency, computed from journal entries).
- Types: Asset, Liability, Equity, Revenue, Expense.
- **Inline Edit**: Click row to edit name, code, type inline. PUT on blur.
- **Add Account**: Modal with Code*, Name*, Type* (dropdown).
- Delete disabled if account has journal entries. Tooltip explains why.

### Journal Ledger

```
┌──────────────────────────────────────────────────────────────┐
│  Journal Entries                            [+ New Entry]    │
├──────────────────────────────────────────────────────────────┤
│  Date Range: [Start] → [End]   Account: [Dropdown: All]      │
├─────────┬──────────┬──────────────┬────────┬────────┬────────┤
│  Date   │  Entry # │  Description  │ Debit  │ Credit │ Actions│
│  05/01  │  JE-001  │  Sale INV-1  │ Acc 1  │ Acc 2  │ [View] │
│  05/02  │  JE-002  │  Purchase    │ Acc 3  │ Acc 4  │ [View] │
└─────────┴──────────┴──────────────┴────────┴────────┴────────┘
```

- Filters: date range picker, account dropdown (filter by account).
- Table: Date, Entry Number, Description, Debit total, Credit total, Actions (View).
- Each row expandable to show line items.

### Double-Entry Journal Form (modal)

**CRITICAL: Balance validation happens on both frontend and backend.** Debits must equal credits.

```
┌─────────────────────────────────────────────────────────────┐
│  New Journal Entry                                           │
├─────────────────────────────────────────────────────────────┤
│  Entry Date: [date picker]                                   │
│  Description: [textarea]                                     │
│  Reference: [text, optional — links to PO/SO/Invoice]       │
│                                                              │
│  Lines:                                                      │
│  ┌─────────────┬──────────┬──────────┬───────────────────┐ │
│  │ Account     │ Debit    │ Credit   │                   │ │
│  ├─────────────┼──────────┼──────────┤                   │ │
│  │ Cash        │ $500.00  │ —        │ [Remove]          │ │
│  │ Revenue     │ —        │ $500.00  │ [Remove]          │ │
│  │ [+ Add Line]          │          │                   │ │
│  └─────────────┴──────────┴──────────┴───────────────────┘ │
│                                                              │
│  Totals: Debit: $500.00   Credit: $500.00                   │
│  Balance: ✓ $0.00                                           │
│                                                              │
│  [Cancel]                              [Submit Entry]       │
└─────────────────────────────────────────────────────────────┘
```

- User selects account from dropdown per line (account type irrelevant at entry level).
- User enters either Debit or Credit per line (not both). If both entered, show validation error.
- Running totals at bottom. Balance = total debits - total credits.
- Balance must be $0.00 for form to be submittable.
- Submit button disabled when balance !== 0.
- Submit POST /api/journal-entries. Backend re-validates balance and returns 422 if off.

### View Entry Drawer
- Read-only display of entry details: date, description, reference.
- Debit lines and credit lines in two separate columns.
- Total validation display.
- No edit (double-entry should not be edited after posting — if needed, reverse with new entry).

---

## Loading / Empty / Error States — Every Page

- On mount: LoadingSkeleton for table, skeleton for detail panel.
- Query error: ErrorState with retry button. Toast for mutation errors (e.g., status transition conflict).
- Empty list (no data): EmptyState with illustration + "Create your first [entity]" CTA.
- Empty filtered results: "No [entities] match your filters" with clear filters link.
- Delete confirmation: Dialog with entity name and type. "Are you sure?" + Cancel/Delete buttons. Destructive button is red.

---

## BRUTAL CALL-OUTS

- **No backend for bulk operations.** The designs above (checkbox select) imply bulk status transitions, bulk delete, bulk PDF download. These do not exist. Each entity must be operated on individually.
- **No payment history endpoint.** POST /api/invoices/{id}/payments creates a payment record, but there is no GET endpoint to retrieve payment history. The "Payment History" section in the Invoice detail drawer will have to derive its data from the invoice response if payments are embedded, or a new endpoint must be added.
- **No customer/vendor CRUD endpoints referenced.** The invoice/PO/SO modals reference "Customer" and "Vendor" autocomplete fields. These require a contacts or vendors API that is not listed in the backend reference. If they don't exist, you'll need to add them or use a freeform text field as fallback.
- **No line-item endpoints exist separately.** Line items are embedded in the order/invoice payload. The modal handles them as nested arrays in the create/update body, which is correct.
- **No inventory valuation / cost calculation.** Stock items track quantity and location but there is no COGS calculation or inventory valuation endpoint. The "Balance" on chart of accounts will need to be manually journaled.
- **Accounting period closing not supported.** No year-end close, no retained earnings calculation, no audit trail. Journal entries are append-only.
