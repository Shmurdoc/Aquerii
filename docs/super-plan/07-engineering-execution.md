# 07 — Engineering Execution Plan
**Aquerii · Laravel + React Monorepo**
**Target: 10/10 Production Readiness**
**Timeline: 6 × 2-week sprints = 12 weeks**

---

## Table of Contents

1. [Pre-Sprint: Technical Decisions](#pre-sprint-technical-decisions)
2. [Architecture Decisions](#architecture-decisions)
3. [Sprint 1 — Foundation](#sprint-1--foundation)
4. [Sprint 2 — ERP Core](#sprint-2--erp-core)
5. [Sprint 3 — Inventory, Accounting, HR Employees & Attendance](#sprint-3--inventory-accounting-hr-employees--attendance)
6. [Sprint 4 — HR Leave & Expenses, Meetings, Reports](#sprint-4--hr-leave--expenses-meetings-reports)
7. [Sprint 5 — Frontend Depth](#sprint-5--frontend-depth)
8. [Sprint 6 — Polish, Performance, Security, E2E](#sprint-6--polish-performance-security-e2e)
9. [Performance Requirements](#performance-requirements)
10. [Deployment Checklist](#deployment-checklist)
11. [Definition of Done — 10/10](#definition-of-done--1010)

---

## Pre-Sprint: Technical Decisions

These decisions must be locked in and spike-tested **before Sprint 1 begins**. Each item has an owner and a deadline of Day 0 (sprint kickoff).

---

### TD-01 · Job Queues — Laravel Horizon

**Decision:** Use Laravel Horizon backed by Redis for all async work.

**Rationale:** Horizon gives per-queue throughput metrics, retry dashboards, and failed-job inspection out of the box. Async jobs required:

| Job Class | Queue | Priority | Max Tries | Timeout |
|---|---|---|---|---|
| `SendEmailVerificationJob` | `mail` | high | 3 | 30s |
| `GeneratePdfInvoiceJob` | `pdf` | default | 2 | 60s |
| `GenerateReportJob` | `reports` | default | 2 | 120s |
| `ProcessExpenseReceiptJob` | `uploads` | default | 3 | 30s |
| `SendNotificationJob` | `notifications` | high | 3 | 15s |
| `FireAutomationJob` | `automations` | low | 5 | 30s |

**Horizon config (`config/horizon.php`):**

```php
'environments' => [
    'production' => [
        'supervisor-mail'          => ['queue' => ['mail'], 'processes' => 3],
        'supervisor-pdf'           => ['queue' => ['pdf'], 'processes' => 2],
        'supervisor-reports'       => ['queue' => ['reports'], 'processes' => 2],
        'supervisor-uploads'       => ['queue' => ['uploads'], 'processes' => 2],
        'supervisor-notifications' => ['queue' => ['notifications'], 'processes' => 4],
        'supervisor-automations'   => ['queue' => ['automations'], 'processes' => 2],
        'supervisor-default'       => ['queue' => ['default'], 'processes' => 3],
    ],
],
```

**Supervisord stanza** (see Deployment Checklist for full config).

---

### TD-02 · PDF Generation — Gotenberg

**Decision:** Run Gotenberg as a sidecar Docker service. Laravel communicates via HTTP to `http://gotenberg:3000`.

**Integration pattern:**

```php
// app/Services/PdfService.php
class PdfService
{
    public function generateFromHtml(string $html, string $filename): string
    {
        $response = Http::attach('files', $html, 'index.html')
            ->post(config('services.gotenberg.url') . '/forms/chromium/convert/html');

        $path = "pdfs/{$filename}";
        Storage::put($path, $response->body());
        return $path;
    }

    public function generateFromBlade(string $view, array $data, string $filename): string
    {
        $html = view($view, $data)->render();
        return $this->generateFromHtml($html, $filename);
    }
}
```

**Blade template location:** `resources/views/pdf/invoice.blade.php`

**Environment variable:** `GOTENBERG_URL=http://gotenberg:3000`

**docker-compose.yml addition:**
```yaml
gotenberg:
  image: gotenberg/gotenberg:8
  restart: unless-stopped
  ports:
    - "3000:3000"
```

**Performance target:** PDF generation < 5s including storage write. Warm Gotenberg with a dummy request on deploy to avoid cold-start penalty.

---

### TD-03 · File Storage — Expense Receipts & Workspace Logo

**Decision:** Use S3-compatible storage (MinIO in dev, AWS S3 in production) via Laravel's `Storage` facade with the `s3` driver.

**Upload flow for receipts:**
1. Frontend requests a pre-signed URL via `POST /api/v1/uploads/presign`
2. Frontend uploads directly to S3 (bypasses PHP process)
3. Frontend confirms upload via `POST /api/v1/uploads/confirm` with the S3 key
4. Backend validates file exists, stores key in `expense_receipts.file_path`

**Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

**Max file size:** 10MB (enforced both client-side and in the confirm endpoint)

**Environment variables:**
```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=
AWS_BUCKET=aquerii-uploads
AWS_ENDPOINT=          # MinIO endpoint in dev
AWS_USE_PATH_STYLE_ENDPOINT=true  # required for MinIO
```

---

### TD-04 · WebSocket Events — Real-Time Notifications

**Decision:** Use Laravel Reverb (or Pusher-compatible server) with Laravel Echo on the frontend.

**Channel strategy:**

| Channel | Type | Event | Payload |
|---|---|---|---|
| `private-user.{userId}` | Private | `NotificationCreated` | `{id, type, title, body, url, read_at}` |
| `private-workspace.{workspaceId}` | Private | `BoardItemUpdated` | `{item_id, column_id, changes}` |
| `private-workspace.{workspaceId}` | Private | `LeaveRequestUpdated` | `{request_id, status}` |

**Broadcasting config:**
```php
// app/Events/NotificationCreated.php
class NotificationCreated implements ShouldBroadcast
{
    public function broadcastOn(): array
    {
        return [new PrivateChannel("user.{$this->notification->user_id}")];
    }
    public function broadcastAs(): string { return 'notification.created'; }
}
```

**Frontend wiring** (see Sprint 5 for full implementation):
```ts
// Echo setup in bootstrap.ts
window.Echo.private(`user.${authUser.id}`)
  .listen('.notification.created', (e) => {
    notificationStore.push(e);
  });
```

---

### TD-05 · Cache Strategy — Redis for Reports

**Decision:** All report dashboard data is computed once and cached in Redis with a 15-minute TTL. Cache is tagged by `workspace_id` so workspace-scoped invalidation is possible.

```php
// app/Services/ReportService.php
public function getDashboard(int $workspaceId): array
{
    return Cache::tags(["workspace:{$workspaceId}", 'reports'])
        ->remember("reports:dashboard:{$workspaceId}", now()->addMinutes(15), function () use ($workspaceId) {
            return $this->computeDashboard($workspaceId);
        });
}

// Invalidate on relevant model changes
public function invalidateDashboard(int $workspaceId): void
{
    Cache::tags(["workspace:{$workspaceId}", 'reports'])->flush();
}
```

**Cache keys:**
- `reports:dashboard:{workspaceId}` — 15 min
- `reports:expenses:{workspaceId}:{month}` — 15 min
- `reports:inventory:{workspaceId}` — 5 min
- `reports:procurement:{workspaceId}:{quarter}` — 15 min

---

## Architecture Decisions

### AD-01 · Service Layer Pattern

All complex business logic lives in `app/Services/`. Controllers are thin: validate input → call service → return response. Services are injectable and fully testable.

**Required service classes:**

```
app/Services/
├── InvoiceService.php       # create, convert from SO, generate PDF, send
├── PurchaseOrderService.php # create, approve, receive
├── SalesOrderService.php    # create, approve, convert to invoice
├── InventoryService.php     # adjust stock, reserve, release
├── AccountingService.php    # post journal entries, compute balances
├── LeaveService.php         # request, approve, decline, balance check
├── ExpenseService.php       # submit, approve, decline, reimburse, receipt upload
├── MeetingService.php       # create, RSVP, attendance mark
├── ReportService.php        # dashboard, expenses, procurement, inventory
├── AutomationService.php    # evaluate triggers, dispatch actions
├── NotificationService.php  # create, broadcast, mark read
└── PdfService.php           # Gotenberg wrapper
```

**Service method contracts (example — LeaveService):**

```php
interface LeaveServiceInterface
{
    public function request(User $user, array $data): LeaveRequest;
    public function approve(LeaveRequest $request, User $approver): LeaveRequest;
    public function decline(LeaveRequest $request, User $approver, string $reason): LeaveRequest;
    public function getBalance(User $user, int $year): array;  // ['annual' => 15, 'used' => 5, 'pending' => 2, 'remaining' => 8]
    public function recalculateBalance(User $user, int $year): void;
}
```

---

### AD-02 · Event-Driven Automation Trigger System

Automations fire when specific model events occur. The trigger system is decoupled via Laravel Events.

**Flow:**
```
Model saved/updated
  → Eloquent Observer dispatches domain event
    → AutomationListener checks active automation rules for workspace
      → FireAutomationJob queued (low priority)
        → AutomationService evaluates conditions
          → Executes actions (send email, create task, update field, notify user)
```

**Trigger events to implement:**

| Trigger | Event Class | Model |
|---|---|---|
| Invoice status changed | `InvoiceStatusChanged` | Invoice |
| Leave request submitted | `LeaveRequestSubmitted` | LeaveRequest |
| Expense submitted | `ExpenseSubmitted` | Expense |
| Board item moved | `BoardItemMoved` | BoardItem |
| Deal stage changed | `DealStageChanged` | Deal |

**Automation rule schema (`automation_templates` table):**
```json
{
  "trigger": { "event": "invoice.status_changed", "conditions": [{ "field": "status", "op": "eq", "value": "overdue" }] },
  "actions": [
    { "type": "send_email", "template": "invoice_overdue", "to": "{{ invoice.contact.email }}" },
    { "type": "notify_user", "user_id": "{{ invoice.created_by }}", "message": "Invoice overdue" }
  ]
}
```

---

### AD-03 · API Versioning Strategy

**Decision:** URL-based versioning (`/api/v1/`). All new routes are under `v1`. No `v2` until a breaking change is required. The prefix is enforced in `routes/api.php`:

```php
Route::prefix('v1')->middleware(['auth:sanctum', 'verified', 'workspace'])->group(function () {
    // all feature routes
});
```

**Response envelope:**
```json
{
  "data": { ... },
  "meta": { "page": 1, "per_page": 25, "total": 120 },
  "message": null
}
```

**Error response:**
```json
{
  "message": "The given data was invalid.",
  "errors": { "field": ["Validation message"] },
  "code": "VALIDATION_ERROR"
}
```

---

## Sprint 1 — Foundation

**Duration:** Weeks 1–2
**Theme:** Database schema, base models, RBAC policies, Settings endpoints, Auth gaps

### Goals

Get all migrations merged, policies registered, and the settings + auth endpoints live. No business logic yet — this sprint is the skeleton every other sprint builds on.

---

### S1 Deliverables

#### 1.1 Migrations (all new tables)

Run in this exact order:

```
database/migrations/
├── 2024_01_01_000001_create_erp_invoices_table.php
├── 2024_01_01_000002_create_erp_invoice_items_table.php
├── 2024_01_01_000003_create_erp_purchase_orders_table.php
├── 2024_01_01_000004_create_erp_purchase_order_items_table.php
├── 2024_01_01_000005_create_erp_sales_orders_table.php
├── 2024_01_01_000006_create_erp_sales_order_items_table.php
├── 2024_01_01_000007_create_erp_inventory_categories_table.php
├── 2024_01_01_000008_create_erp_products_table.php
├── 2024_01_01_000009_create_erp_stock_movements_table.php
├── 2024_01_01_000010_create_accounting_accounts_table.php
├── 2024_01_01_000011_create_accounting_journal_entries_table.php
├── 2024_01_01_000012_create_accounting_journal_entry_lines_table.php
├── 2024_01_01_000013_create_hr_employees_table.php
├── 2024_01_01_000014_create_hr_attendance_table.php
├── 2024_01_01_000015_create_hr_leave_types_table.php
├── 2024_01_01_000016_create_hr_leave_requests_table.php
├── 2024_01_01_000017_create_hr_leave_balances_table.php
├── 2024_01_01_000018_create_hr_expenses_table.php
├── 2024_01_01_000019_create_hr_expense_receipts_table.php
├── 2024_01_01_000020_create_meetings_table.php
├── 2024_01_01_000021_create_meeting_attendees_table.php
├── 2024_01_01_000022_create_automation_templates_table.php
├── 2024_01_01_000023_create_audit_logs_table.php
├── 2024_01_01_000024_add_logo_to_workspaces_table.php
└── 2024_01_01_000025_create_notification_preferences_table.php
```

**Key column definitions:**

```php
// invoices
Schema::create('erp_invoices', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('sales_order_id')->nullable()->constrained('erp_sales_orders')->nullOnDelete();
    $table->foreignId('created_by')->constrained('users');
    $table->string('invoice_number')->unique();
    $table->enum('status', ['draft','sent','partial','paid','overdue','void'])->default('draft');
    $table->string('currency', 3)->default('ZAR');
    $table->decimal('subtotal', 14, 2)->default(0);
    $table->decimal('tax_amount', 14, 2)->default(0);
    $table->decimal('total', 14, 2)->default(0);
    $table->decimal('amount_paid', 14, 2)->default(0);
    $table->date('issue_date');
    $table->date('due_date');
    $table->text('notes')->nullable();
    $table->string('pdf_path')->nullable();
    $table->timestamps();
    $table->softDeletes();
    $table->index(['workspace_id', 'status']);
    $table->index(['workspace_id', 'due_date']);
});

// hr_leave_balances
Schema::create('hr_leave_balances', function (Blueprint $table) {
    $table->id();
    $table->foreignId('employee_id')->constrained('hr_employees')->cascadeOnDelete();
    $table->foreignId('leave_type_id')->constrained('hr_leave_types')->cascadeOnDelete();
    $table->year('year');
    $table->decimal('entitled', 5, 1)->default(0);
    $table->decimal('used', 5, 1)->default(0);
    $table->decimal('pending', 5, 1)->default(0);
    $table->timestamps();
    $table->unique(['employee_id', 'leave_type_id', 'year']);
});
```

#### 1.2 Base Models

```
app/Models/
├── Erp/
│   ├── Invoice.php
│   ├── InvoiceItem.php
│   ├── PurchaseOrder.php
│   ├── PurchaseOrderItem.php
│   ├── SalesOrder.php
│   └── SalesOrderItem.php
├── Inventory/
│   ├── InventoryCategory.php
│   ├── Product.php
│   └── StockMovement.php
├── Accounting/
│   ├── Account.php
│   ├── JournalEntry.php
│   └── JournalEntryLine.php
├── Hr/
│   ├── Employee.php
│   ├── Attendance.php
│   ├── LeaveType.php
│   ├── LeaveRequest.php
│   ├── LeaveBalance.php
│   ├── Expense.php
│   └── ExpenseReceipt.php
├── Meeting.php
├── MeetingAttendee.php
├── AutomationTemplate.php
├── AuditLog.php
└── NotificationPreference.php
```

All models must:
- Extend `BaseModel` (which scopes to `workspace_id` via global scope)
- Use `SoftDeletes` where appropriate
- Define `$fillable` and `$casts`
- Define relationships

#### 1.3 RBAC Policies

```
app/Policies/
├── InvoicePolicy.php         # viewAny, view, create, update, delete, generatePdf
├── PurchaseOrderPolicy.php   # viewAny, view, create, update, approve, delete
├── SalesOrderPolicy.php      # viewAny, view, create, update, approve, delete
├── ProductPolicy.php         # viewAny, view, create, update, delete
├── AccountPolicy.php         # viewAny, view, create, update, delete
├── EmployeePolicy.php        # viewAny, view, create, update, delete
├── AttendancePolicy.php      # viewAny, view, clockIn, clockOut, edit (HR manager only)
├── LeaveRequestPolicy.php    # viewAny, view, create, approve, decline
├── ExpensePolicy.php         # viewAny, view, create, approve, decline, reimburse
├── MeetingPolicy.php         # viewAny, view, create, update, delete
└── ReportPolicy.php          # view (manager+)
```

Register all policies in `AuthServiceProvider`.

#### 1.4 Settings Endpoints

**Routes** (`routes/api.php` under `settings` prefix):

```
GET    /api/v1/settings/workspace          → WorkspaceSettingsController@show
PUT    /api/v1/settings/workspace          → WorkspaceSettingsController@update
POST   /api/v1/settings/workspace/logo     → WorkspaceSettingsController@uploadLogo
DELETE /api/v1/settings/workspace/logo     → WorkspaceSettingsController@deleteLogo

GET    /api/v1/settings/notifications      → NotificationPreferenceController@index
PUT    /api/v1/settings/notifications      → NotificationPreferenceController@update

GET    /api/v1/settings/sessions           → SessionController@index
DELETE /api/v1/settings/sessions/{id}      → SessionController@destroy
DELETE /api/v1/settings/sessions           → SessionController@destroyAll

GET    /api/v1/settings/audit-logs         → AuditLogController@index

POST   /api/v1/settings/password           → PasswordController@update
```

#### 1.5 Auth Gap Endpoints

```
GET    /api/v1/auth/verify-email/{id}/{hash}  → VerifyEmailController@verify
POST   /api/v1/auth/email/resend              → VerifyEmailController@resend
GET    /api/v1/auth/oauth/{provider}          → OAuthController@redirect
GET    /api/v1/auth/oauth/{provider}/callback → OAuthController@callback
POST   /api/v1/auth/token/refresh             → TokenController@refresh
```

#### 1.6 AuditLog Observer

Every model mutation (create/update/delete) on key models must be recorded:

```php
// app/Observers/AuditObserver.php
class AuditObserver
{
    public function created(Model $model): void { $this->log('created', $model); }
    public function updated(Model $model): void { $this->log('updated', $model, $model->getChanges()); }
    public function deleted(Model $model): void { $this->log('deleted', $model); }
}
```

Register in `AppServiceProvider` for: Invoice, PurchaseOrder, SalesOrder, LeaveRequest, Expense, Employee.

---

### S1 Acceptance Criteria

- [ ] All 25 migrations run cleanly on a fresh database with `php artisan migrate`
- [ ] `php artisan migrate:fresh --seed` completes without errors
- [ ] All policies registered; `php artisan route:list` shows all S1 routes
- [ ] `GET /api/v1/settings/workspace` returns workspace data for authenticated user
- [ ] `POST /api/v1/settings/workspace/logo` accepts a file, stores to S3, returns URL
- [ ] `GET /api/v1/settings/sessions` returns active sessions with last-active timestamps
- [ ] `GET /api/v1/auth/verify-email/{id}/{hash}` marks user as verified
- [ ] `GET /api/v1/settings/audit-logs` returns paginated log with filters (user, action, date)
- [ ] No N+1 queries in any S1 endpoint (confirmed via Debugbar in dev)

### S1 Testing Requirements

- Unit tests for all Policy classes (60+ assertions)
- Feature tests: `WorkspaceSettingsTest`, `SessionControllerTest`, `AuditLogTest`, `VerifyEmailTest`
- Factory definitions for all new models

---

## Sprint 2 — ERP Core

**Duration:** Weeks 3–4
**Theme:** Invoices (+ PDF via Gotenberg + SO→Invoice), Purchase Orders, Sales Orders

---

### S2 Deliverables

#### 2.1 Invoice Module

**Routes:**

```
GET    /api/v1/erp/invoices              → InvoiceController@index
POST   /api/v1/erp/invoices              → InvoiceController@store
GET    /api/v1/erp/invoices/{id}         → InvoiceController@show
PUT    /api/v1/erp/invoices/{id}         → InvoiceController@update
DELETE /api/v1/erp/invoices/{id}         → InvoiceController@destroy
POST   /api/v1/erp/invoices/{id}/send    → InvoiceController@send
POST   /api/v1/erp/invoices/{id}/pdf     → InvoiceController@generatePdf
POST   /api/v1/erp/invoices/{id}/void    → InvoiceController@void
POST   /api/v1/erp/invoices/{id}/payment → InvoiceController@recordPayment
```

**InvoiceService key methods:**

```php
public function create(array $data): Invoice;
public function updateTotals(Invoice $invoice): void;     // recalculates subtotal/tax/total from items
public function convertFromSalesOrder(SalesOrder $so): Invoice;
public function generatePdf(Invoice $invoice): string;    // returns storage path, dispatches job
public function send(Invoice $invoice): void;             // marks as sent, dispatches email job
public function recordPayment(Invoice $invoice, float $amount, string $date): void;
public function void(Invoice $invoice): void;
public function markOverdue(): void;                      // called by scheduled command
```

**SO → Invoice conversion rules:**
- Copy all line items from `SalesOrder` to new `Invoice`
- Set `invoice.sales_order_id = so.id`
- Set `sales_order.invoice_id = invoice.id`
- Set SO status to `invoiced`
- Recalculate totals on invoice

**PDF Blade template** (`resources/views/pdf/invoice.blade.php`):
- Must render: invoice number, workspace logo, bill-to contact, line items table, subtotal/tax/total, due date, payment terms, notes
- Must be print-safe (no floats, explicit widths, inline styles)

**Scheduled command:**
```php
// app/Console/Commands/MarkOverdueInvoicesCommand.php
// Runs daily at 08:00: marks invoices past due_date as 'overdue', dispatches notifications
```

#### 2.2 Purchase Order Module

**Routes:**

```
GET    /api/v1/erp/purchase-orders              → PurchaseOrderController@index
POST   /api/v1/erp/purchase-orders              → PurchaseOrderController@store
GET    /api/v1/erp/purchase-orders/{id}         → PurchaseOrderController@show
PUT    /api/v1/erp/purchase-orders/{id}         → PurchaseOrderController@update
DELETE /api/v1/erp/purchase-orders/{id}         → PurchaseOrderController@destroy
POST   /api/v1/erp/purchase-orders/{id}/approve → PurchaseOrderController@approve
POST   /api/v1/erp/purchase-orders/{id}/receive → PurchaseOrderController@receive
```

**Status flow:** `draft` → `pending_approval` → `approved` → `partially_received` → `received` → `closed`

**Receive action:** Updates `StockMovement` records and adjusts `products.quantity_on_hand`.

#### 2.3 Sales Order Module

**Routes:**

```
GET    /api/v1/erp/sales-orders                      → SalesOrderController@index
POST   /api/v1/erp/sales-orders                      → SalesOrderController@store
GET    /api/v1/erp/sales-orders/{id}                 → SalesOrderController@show
PUT    /api/v1/erp/sales-orders/{id}                 → SalesOrderController@update
DELETE /api/v1/erp/sales-orders/{id}                 → SalesOrderController@destroy
POST   /api/v1/erp/sales-orders/{id}/approve         → SalesOrderController@approve
POST   /api/v1/erp/sales-orders/{id}/convert-invoice → SalesOrderController@convertToInvoice
```

**Status flow:** `draft` → `pending_approval` → `approved` → `invoiced` → `fulfilled` → `closed`

#### 2.4 Request Validation Classes

```
app/Http/Requests/Erp/
├── StoreInvoiceRequest.php
├── UpdateInvoiceRequest.php
├── RecordPaymentRequest.php
├── StorePurchaseOrderRequest.php
├── UpdatePurchaseOrderRequest.php
├── ReceivePurchaseOrderRequest.php
├── StoreSalesOrderRequest.php
└── UpdateSalesOrderRequest.php
```

All requests: workspace scoping, line-item array validation, currency validation.

#### 2.5 Invoice PDF Job

```php
// app/Jobs/GeneratePdfInvoiceJob.php
class GeneratePdfInvoiceJob implements ShouldQueue
{
    public int $timeout = 60;
    public int $tries = 2;
    public function handle(PdfService $pdf): void
    {
        $path = $pdf->generateFromBlade('pdf.invoice', ['invoice' => $this->invoice->load('items', 'workspace')], "invoice-{$this->invoice->invoice_number}.pdf");
        $this->invoice->update(['pdf_path' => $path]);
    }
}
```

---

### S2 Acceptance Criteria

- [ ] `POST /api/v1/erp/invoices` creates an invoice with correct totals (subtotal + tax = total)
- [ ] `POST /api/v1/erp/invoices/{id}/pdf` enqueues `GeneratePdfInvoiceJob`; polling the invoice after job completion returns a non-null `pdf_path`
- [ ] `GET /api/v1/erp/invoices/{id}` returns a temporary signed URL for the PDF
- [ ] `POST /api/v1/erp/sales-orders/{id}/convert-invoice` creates invoice with all SO line items and links both records
- [ ] `POST /api/v1/erp/purchase-orders/{id}/receive` creates `StockMovement` records and updates `products.quantity_on_hand`
- [ ] `POST /api/v1/erp/invoices/{id}/void` sets status to `void` and cannot be un-voided
- [ ] `POST /api/v1/erp/invoices/{id}/payment` with amount equal to balance sets status to `paid`
- [ ] All ERP endpoints return `403` if user lacks the relevant policy gate
- [ ] Invoice list endpoint returns < 200ms at 1,000 invoice records (verified with a seeded DB)
- [ ] PDF generation completes < 5s in CI (using Gotenberg test container)

### S2 Testing Requirements

- Feature tests: `InvoiceControllerTest`, `SalesOrderControllerTest`, `PurchaseOrderControllerTest`
- Unit tests: `InvoiceServiceTest` (totals calculation, overdue marking, SO conversion)
- Job test: `GeneratePdfInvoiceJobTest` (mock PdfService, assert invoice pdf_path updated)
- Factory: `InvoiceFactory`, `SalesOrderFactory`, `PurchaseOrderFactory` with states (draft, sent, paid, overdue)

---

## Sprint 3 — Inventory, Accounting, HR Employees & Attendance

**Duration:** Weeks 5–6
**Theme:** Inventory CRUD + stock, Chart of Accounts + journal entries, HR employee profiles + clock-in/out

---

### S3 Deliverables

#### 3.1 Inventory Module

**Routes:**

```
# Categories
GET    /api/v1/inventory/categories          → CategoryController@index
POST   /api/v1/inventory/categories          → CategoryController@store
PUT    /api/v1/inventory/categories/{id}     → CategoryController@update
DELETE /api/v1/inventory/categories/{id}     → CategoryController@destroy

# Products
GET    /api/v1/inventory/products            → ProductController@index
POST   /api/v1/inventory/products            → ProductController@store
GET    /api/v1/inventory/products/{id}       → ProductController@show
PUT    /api/v1/inventory/products/{id}       → ProductController@update
DELETE /api/v1/inventory/products/{id}       → ProductController@destroy
POST   /api/v1/inventory/products/{id}/adjust → ProductController@adjustStock

# Stock movements
GET    /api/v1/inventory/movements           → StockMovementController@index
GET    /api/v1/inventory/products/{id}/movements → StockMovementController@forProduct
```

**InventoryService key methods:**

```php
public function adjustStock(Product $product, int $quantity, string $type, string $reason, ?int $referenceId = null): StockMovement;
// type: 'purchase', 'sale', 'adjustment', 'return', 'write_off'
// Creates StockMovement record, updates product.quantity_on_hand
// Fires 'low_stock' event if quantity_on_hand <= product.reorder_point
```

**Product model fields:** `sku`, `name`, `description`, `category_id`, `unit_price`, `cost_price`, `quantity_on_hand`, `reorder_point`, `unit_of_measure`, `is_active`

#### 3.2 Accounting Module

**Routes:**

```
# Chart of Accounts
GET    /api/v1/accounting/accounts          → AccountController@index
POST   /api/v1/accounting/accounts          → AccountController@store
GET    /api/v1/accounting/accounts/{id}     → AccountController@show
PUT    /api/v1/accounting/accounts/{id}     → AccountController@update
DELETE /api/v1/accounting/accounts/{id}     → AccountController@destroy

# Journal Entries
GET    /api/v1/accounting/journal-entries          → JournalEntryController@index
POST   /api/v1/accounting/journal-entries          → JournalEntryController@store
GET    /api/v1/accounting/journal-entries/{id}     → JournalEntryController@show
POST   /api/v1/accounting/journal-entries/{id}/post → JournalEntryController@post
POST   /api/v1/accounting/journal-entries/{id}/void → JournalEntryController@void
```

**AccountingService key methods:**

```php
public function postJournalEntry(JournalEntry $entry): void;
// Validates debits == credits (balanced entry)
// Sets entry status to 'posted'
// Updates account balances

public function getAccountBalance(Account $account, ?Carbon $asOf = null): float;

public function getTrialBalance(int $workspaceId, Carbon $asOf): array;
```

**Account types:** `asset`, `liability`, `equity`, `revenue`, `expense`

**Validation rule:** Journal entry cannot be posted if `sum(debits) !== sum(credits)`. Return `422` with message `"Journal entry is not balanced"`.

#### 3.3 HR — Employee Profiles

**Routes:**

```
GET    /api/v1/hr/employees          → EmployeeController@index
POST   /api/v1/hr/employees          → EmployeeController@store
GET    /api/v1/hr/employees/{id}     → EmployeeController@show
PUT    /api/v1/hr/employees/{id}     → EmployeeController@update
DELETE /api/v1/hr/employees/{id}     → EmployeeController@destroy
```

**Employee fields:** `employee_number`, `user_id` (nullable — link to auth user), `department`, `job_title`, `employment_type` (full_time/part_time/contractor), `start_date`, `end_date`, `manager_id` (self-referential FK), `salary`, `salary_currency`, `status` (active/inactive/terminated)

**Business rule:** Deleting an employee soft-deletes only if they have no active leave requests or pending expenses.

#### 3.4 HR — Attendance

**Routes:**

```
GET    /api/v1/hr/attendance                    → AttendanceController@index
POST   /api/v1/hr/attendance/clock-in           → AttendanceController@clockIn
POST   /api/v1/hr/attendance/clock-out          → AttendanceController@clockOut
GET    /api/v1/hr/attendance/today              → AttendanceController@today
GET    /api/v1/hr/employees/{id}/attendance     → AttendanceController@forEmployee
PUT    /api/v1/hr/attendance/{id}               → AttendanceController@update  # HR manager only
```

**Business rules:**
- Clock-in fails if employee already has an open (no clock-out) record today
- Clock-out fails if no open record exists
- `duration_minutes` is computed on clock-out and stored
- HR managers can manually edit records (`update` endpoint)

---

### S3 Acceptance Criteria

- [ ] `POST /api/v1/inventory/products/{id}/adjust` with negative quantity creates a `write_off` movement and reduces `quantity_on_hand`
- [ ] Adjusting stock below `reorder_point` fires `LowStockEvent` (assert via event fake in test)
- [ ] `POST /api/v1/accounting/journal-entries/{id}/post` returns `422` if debits ≠ credits
- [ ] `GET /api/v1/accounting/accounts` returns accounts with current balance computed
- [ ] `POST /api/v1/hr/attendance/clock-in` returns `409` if employee already clocked in today
- [ ] `POST /api/v1/hr/attendance/clock-out` sets `duration_minutes` correctly
- [ ] Employee `manager_id` self-referential relationship loads correctly (no infinite recursion)
- [ ] All list endpoints paginated (25 per page default, `per_page` query param supported up to 100)
- [ ] Inventory product list returns < 200ms at 1,000 products with category eager-loaded

### S3 Testing Requirements

- Feature tests: `InventoryControllerTest`, `AccountingControllerTest`, `EmployeeControllerTest`, `AttendanceControllerTest`
- Unit tests: `AccountingServiceTest` (balanced entry validation, balance computation), `InventoryServiceTest` (stock adjustment, low-stock trigger)
- Factories: all HR and Inventory models

---

## Sprint 4 — HR Leave & Expenses, Meetings, Reports

**Duration:** Weeks 7–8
**Theme:** Leave lifecycle, expense submission + approval + receipt upload, meetings RSVP, reports dashboard + CSV export

---

### S4 Deliverables

#### 4.1 HR — Leave

**Routes:**

```
# Leave Types (admin)
GET    /api/v1/hr/leave-types          → LeaveTypeController@index
POST   /api/v1/hr/leave-types          → LeaveTypeController@store
PUT    /api/v1/hr/leave-types/{id}     → LeaveTypeController@update
DELETE /api/v1/hr/leave-types/{id}     → LeaveTypeController@destroy

# Leave Requests
GET    /api/v1/hr/leave-requests          → LeaveRequestController@index
POST   /api/v1/hr/leave-requests          → LeaveRequestController@store
GET    /api/v1/hr/leave-requests/{id}     → LeaveRequestController@show
POST   /api/v1/hr/leave-requests/{id}/approve  → LeaveRequestController@approve
POST   /api/v1/hr/leave-requests/{id}/decline  → LeaveRequestController@decline
DELETE /api/v1/hr/leave-requests/{id}          → LeaveRequestController@destroy  # only if pending

# Leave Balances
GET    /api/v1/hr/employees/{id}/leave-balances → LeaveBalanceController@index
```

**LeaveService business rules:**
- Cannot request leave if remaining balance < requested days
- Cannot request leave that overlaps with an existing approved request for the same employee
- Approving a pending request deducts from `hr_leave_balances.pending` and adds to `used`
- Declining a request re-adds to `pending` balance (returns it)
- Leave balance initialised for new employees via `InitialiseLeaveBalancesJob`

#### 4.2 HR — Expenses

**Routes:**

```
GET    /api/v1/hr/expenses                          → ExpenseController@index
POST   /api/v1/hr/expenses                          → ExpenseController@store
GET    /api/v1/hr/expenses/{id}                     → ExpenseController@show
PUT    /api/v1/hr/expenses/{id}                     → ExpenseController@update  # only if draft
DELETE /api/v1/hr/expenses/{id}                     → ExpenseController@destroy # only if draft
POST   /api/v1/hr/expenses/{id}/submit              → ExpenseController@submit
POST   /api/v1/hr/expenses/{id}/approve             → ExpenseController@approve
POST   /api/v1/hr/expenses/{id}/decline             → ExpenseController@decline
POST   /api/v1/hr/expenses/{id}/reimburse           → ExpenseController@reimburse
POST   /api/v1/hr/expenses/{id}/receipts            → ExpenseController@uploadReceipt
DELETE /api/v1/hr/expenses/{id}/receipts/{receiptId} → ExpenseController@deleteReceipt
```

**Expense status flow:** `draft` → `submitted` → `approved` → `reimbursed` (or `declined` from submitted/approved)

**Receipt upload flow:**
1. `POST /api/v1/hr/expenses/{id}/receipts` accepts `file` multipart upload
2. Backend validates MIME type and size (max 10MB)
3. Dispatches `ProcessExpenseReceiptJob` which stores to S3 and creates `ExpenseReceipt` record
4. Returns `{ receipt_id, status: 'processing' }`
5. When job completes, broadcasts `ExpenseReceiptProcessed` event to `private-user.{userId}`

#### 4.3 Meetings

**Routes:**

```
GET    /api/v1/meetings               → MeetingController@index
POST   /api/v1/meetings               → MeetingController@store
GET    /api/v1/meetings/{id}          → MeetingController@show
PUT    /api/v1/meetings/{id}          → MeetingController@update
DELETE /api/v1/meetings/{id}          → MeetingController@destroy
POST   /api/v1/meetings/{id}/invite   → MeetingController@invite     # add attendees
DELETE /api/v1/meetings/{id}/invite/{userId} → MeetingController@uninvite
POST   /api/v1/meetings/{id}/rsvp     → MeetingController@rsvp       # body: { response: 'accepted'|'declined'|'tentative' }
POST   /api/v1/meetings/{id}/attend   → MeetingController@markAttended # post-meeting
```

**Meeting fields:** `title`, `description`, `location`, `meeting_url`, `starts_at`, `ends_at`, `organizer_id`, `status` (scheduled/in_progress/completed/cancelled), `is_recurring`, `recurrence_rule`

#### 4.4 Reports Module

**Routes:**

```
GET /api/v1/reports/dashboard        → ReportController@dashboard
GET /api/v1/reports/expenses         → ReportController@expenses
GET /api/v1/reports/procurement      → ReportController@procurement
GET /api/v1/reports/inventory        → ReportController@inventory

# CSV exports (async)
POST /api/v1/reports/exports          → ReportController@requestExport
GET  /api/v1/reports/exports/{jobId}  → ReportController@exportStatus
GET  /api/v1/reports/exports/{jobId}/download → ReportController@downloadExport
```

**Dashboard response shape:**
```json
{
  "data": {
    "revenue": { "mtd": 125000, "ytd": 890000, "trend": 12.3 },
    "expenses": { "mtd": 45000, "ytd": 320000, "trend": -2.1 },
    "invoices": { "outstanding": 18, "overdue": 4, "total_overdue_amount": 72000 },
    "purchase_orders": { "pending_approval": 3, "pending_receipt": 7 },
    "leave_requests": { "pending": 5 },
    "inventory": { "low_stock_count": 12, "out_of_stock_count": 3 },
    "headcount": { "active": 48, "on_leave_today": 3 }
  }
}
```

**CSV export jobs:**
- `GenerateExpenseReportJob` — filters: date range, employee, category, status
- `GenerateProcurementReportJob` — filters: date range, supplier, status
- `GenerateInventoryReportJob` — filters: category, low_stock_only

All export jobs write to `S3/exports/{workspaceId}/{jobId}.csv` and set a 24h expiry on the download URL.

#### 4.5 Automation Templates (Global Route)

```
GET    /api/v1/automations          → AutomationController@index
POST   /api/v1/automations          → AutomationController@store
GET    /api/v1/automations/{id}     → AutomationController@show
PUT    /api/v1/automations/{id}     → AutomationController@update
DELETE /api/v1/automations/{id}     → AutomationController@destroy
POST   /api/v1/automations/{id}/toggle → AutomationController@toggle  # enable/disable
```

---

### S4 Acceptance Criteria

- [ ] `POST /api/v1/hr/leave-requests` returns `422` if requested days exceed remaining balance
- [ ] `POST /api/v1/hr/leave-requests` returns `422` if dates overlap existing approved request
- [ ] `POST /api/v1/hr/leave-requests/{id}/approve` deducts from balance; `GET /api/v1/hr/employees/{id}/leave-balances` reflects change
- [ ] `POST /api/v1/hr/expenses/{id}/receipts` returns `processing` status; after job runs, `GET /api/v1/hr/expenses/{id}` includes receipt with `file_url`
- [ ] `POST /api/v1/meetings/{id}/rsvp` updates attendee's response; `GET /api/v1/meetings/{id}` reflects RSVP
- [ ] `GET /api/v1/reports/dashboard` returns < 1s (cached); second call should be < 50ms
- [ ] `POST /api/v1/reports/exports` returns a `job_id`; polling status returns `complete` after job runs; download URL returns a valid CSV
- [ ] All expense state transitions enforce the correct flow (cannot approve a `draft` directly)
- [ ] Cannot delete a meeting with attendees who have accepted (returns `409`)

### S4 Testing Requirements

- Feature tests: `LeaveRequestControllerTest`, `ExpenseControllerTest`, `MeetingControllerTest`, `ReportControllerTest`
- Unit tests: `LeaveServiceTest` (balance logic, overlap detection), `ReportServiceTest` (caching behavior)
- Integration tests: receipt upload flow (mock S3, assert job dispatched and receipt record created)

---

## Sprint 5 — Frontend Depth

**Duration:** Weeks 9–10
**Theme:** Boards column management + subitems + activity feed, CRM pipeline depth, AI features, Auth fixes, Billing, Notifications WebSocket

---

### S5 Deliverables

#### 5.1 Auth Frontend

**Files to create/modify:**

```
src/pages/auth/
├── VerifyEmailPage.tsx          # NEW — shows verify prompt, resend button
└── OAuthCallbackPage.tsx        # NEW — handles OAuth redirect, exchanges code, stores token

src/lib/
└── axiosInstance.ts             # MODIFY — add silent refresh interceptor
```

**Refresh interceptor pattern:**

```ts
// src/lib/axiosInstance.ts
axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post('/api/v1/auth/token/refresh', {}, { withCredentials: true });
        setAccessToken(data.access_token);
        original.headers['Authorization'] = `Bearer ${data.access_token}`;
        return axiosInstance(original);
      } catch {
        authStore.logout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
```

**VerifyEmailPage:** Shows "Check your inbox" message, displays email address, "Resend verification email" button with 60s cooldown, auto-redirects to dashboard on verification.

**OAuthCallbackPage:** Reads `?code=` and `?state=` from URL, calls backend callback endpoint, stores token, redirects to `/dashboard`.

#### 5.2 Boards — Column Management & Depth

**Files:**

```
src/pages/boards/
├── components/
│   ├── ColumnManager.tsx         # NEW — add/rename/delete/reorder columns
│   ├── BoardItemActivity.tsx     # NEW — activity feed per item (comments, changes, file uploads)
│   ├── SubitemList.tsx           # NEW — subitems under a board item
│   ├── SubitemRow.tsx            # NEW
│   ├── DuplicateItemModal.tsx    # NEW
│   ├── MoveItemModal.tsx         # NEW — move item to different board/group
│   └── FileAttachmentPanel.tsx   # NEW — upload/view/delete file attachments on item
```

**Feature specs:**

- **Column Management:** Drag-to-reorder columns. Inline rename. Column type selector (text, number, date, status, person, label). Delete column (with confirmation if data exists).
- **Activity Feed:** Ordered list of changes with timestamp, user avatar, diff (old → new for status changes). Supports infinite scroll (load more button at bottom). New comment form at top.
- **Subitems:** Collapsible subitem section under each item row. Subitems have their own status column. "Add subitem" inline row at bottom. Subitem count badge on parent row.
- **Duplicate Item:** Modal allows choosing target board and group. Pre-fills name with "Copy of …". Option to include subitems.
- **Move Item:** Dropdown of boards → groups within the selected board.
- **File Attachments:** Drag-and-drop zone. Shows thumbnail for images, file icon for others. Max 25MB. Calls presign endpoint.

#### 5.3 CRM — Companies & Pipeline Depth

**Files:**

```
src/pages/crm/
├── CompaniesPage.tsx             # NEW — list/create/edit/delete companies
├── components/
│   ├── CompanyCard.tsx           # NEW
│   ├── CompanyForm.tsx           # NEW
│   ├── PipelineStageManager.tsx  # NEW — add/rename/delete/reorder pipeline stages
│   └── DealMoveModal.tsx         # NEW — move deal across stages with confirmation
```

**Pipeline stage manager:** Opens as a settings panel from the pipeline board header. Drag-to-reorder stages. Inline name edit. Stage colour picker. Cannot delete a stage with active deals (shows count).

**Deal move:** Drag-and-drop between columns (already using DnD kit). `DealMoveModal` fires when dropping into a stage with required fields (e.g. close date required on "Proposal" stage).

#### 5.4 AI Features

**Files:**

```
src/components/ai/
├── AIChatPanel.tsx               # NEW — sliding panel, conversation history, streaming response
├── AICreditDisplay.tsx           # NEW — shows remaining credits in header
├── AIGenerateDescriptionButton.tsx  # NEW — inline button on item/deal/document forms
├── AIGenerateDocumentModal.tsx   # NEW — full document generation modal
└── AIAutomationSuggest.tsx       # NEW — suggests automation rules from usage patterns

src/hooks/
└── useAIStream.ts                # NEW — SSE/streaming hook for AI responses
```

**AIChatPanel:** Fixed sliding panel (right side, 400px wide). Shows conversation thread. Input at bottom. "Clear chat" button. Uses `useAIStream` for streaming tokens.

**AICreditDisplay:** Shows `{used}/{total}` credits with progress ring. Clicking opens "Upgrade plan" modal if <10% remaining. Polls every 5 minutes.

**Inline generation:** `AIGenerateDescriptionButton` appears next to Description fields. On click: shows loading spinner, calls `POST /api/v1/ai/generate-description` with context, inserts result into field.

#### 5.5 Billing — PayFast Checkout

**Files:**

```
src/pages/billing/
├── BillingPage.tsx               # MODIFY — add PayFast checkout flow
├── components/
│   ├── PlanSelector.tsx          # NEW — plan cards with feature comparison
│   ├── PayFastCheckoutButton.tsx # NEW — builds PayFast form and submits
│   └── PayFastReturnPage.tsx     # NEW — handles return_url, shows success/failure
```

**PayFast integration pattern:**
- Backend generates a signed PayFast payload via `POST /api/v1/billing/checkout`
- Frontend receives the payload and auto-submits a hidden form to PayFast sandbox/live URL
- PayFast posts ITN to `POST /api/v1/billing/payfast/itn` (backend validates signature, updates subscription)
- User is redirected to `/billing/return?status=success|failed`

#### 5.6 Notifications — WebSocket Wiring

**Files:**

```
src/components/notifications/
├── NotificationPanel.tsx         # MODIFY — wire to Echo, show real-time badge
└── NotificationItem.tsx          # MODIFY — add mark-as-read action

src/lib/
└── echo.ts                       # NEW — Laravel Echo setup with Reverb/Pusher config

src/stores/
└── notificationStore.ts          # MODIFY — add pushNotification action, unread count
```

**Echo setup:**

```ts
// src/lib/echo.ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;
export const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT,
  wssPort: import.meta.env.VITE_REVERB_PORT,
  forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
  enabledTransports: ['ws', 'wss'],
  authEndpoint: '/api/v1/broadcasting/auth',
});
```

#### 5.7 Settings Pages (Frontend)

```
src/pages/settings/
├── WorkspaceLogoSection.tsx      # NEW — upload/remove logo with preview
├── SessionsSection.tsx           # NEW — list active sessions, revoke individual/all
├── NotificationPrefsSection.tsx  # NEW — per-event toggle switches
└── PasswordSection.tsx           # NEW — current password + new password + confirm
```

---

### S5 Acceptance Criteria

- [ ] Expired JWT triggers silent refresh; user never sees a 401 page
- [ ] `VerifyEmailPage` resend button is disabled for 60s after click; shows countdown
- [ ] Board column can be added, renamed, reordered, and deleted from the UI
- [ ] Board item opens activity feed showing last 20 events with user avatar and diff
- [ ] Subitem rows render under parent; "Add subitem" creates a new row inline
- [ ] CRM Companies page lists companies with search and create/edit/delete
- [ ] Pipeline stage manager opens, allows rename and reorder without page refresh
- [ ] AI chat panel opens and streams a response token-by-token
- [ ] PayFast checkout form submits to correct URL with valid signature
- [ ] Real-time notification appears in NotificationPanel < 2s after backend event is fired (tested manually with a `tinker` command)
- [ ] Workspace logo upload shows preview, updates workspace logo in nav immediately
- [ ] Session list shows current session highlighted; "Revoke all other sessions" works

### S5 Testing Requirements

- Component tests (Vitest + Testing Library): `NotificationPanel`, `AIChatPanel`, `ColumnManager`, `SubitemList`
- Integration test: refresh interceptor (mock 401 → mock token refresh → assert original request retried)
- E2E (Playwright): board item create → add subitem → add comment → verify activity feed

---

## Sprint 6 — Polish, Performance, Security, E2E

**Duration:** Weeks 11–12
**Theme:** Design review pass, performance profiling, full e2e test suite, security re-audit, final deployment prep

---

### S6 Deliverables

#### 6.1 Design Review Pass

Run `/design-review` skill on all new pages. Fix issues found:

- Consistent spacing (8px grid)
- Loading skeleton states on all list views (replace any raw spinners)
- Empty states on all list views (icon + message + primary CTA)
- Error states with retry buttons (not just console errors)
- Mobile responsiveness on settings pages and forms
- Keyboard navigation on all modals (focus trap, Escape to close)
- ARIA labels on all icon-only buttons
- Color contrast AA compliance on all text

**Files expected to change:** All new pages from S5, `BoardPage`, `CRMPipelinePage`, `ReportsPage`

#### 6.2 Performance Profiling & Fixes

**Backend:**

Run `php artisan telescope:install` in dev and profile every endpoint listed in this plan. Fix any:

- Missing database indexes (add in a migration — never modify existing migrations)
- N+1 queries (add eager loads to all controller queries)
- Missing pagination on unbounded queries
- Slow report queries (add composite indexes, rewrite with raw SQL if needed)

**Key indexes to verify exist:**

```sql
-- erp_invoices
CREATE INDEX idx_invoices_workspace_status ON erp_invoices(workspace_id, status);
CREATE INDEX idx_invoices_due_date ON erp_invoices(workspace_id, due_date);

-- hr_leave_requests
CREATE INDEX idx_leave_workspace_status ON hr_leave_requests(workspace_id, status);
CREATE INDEX idx_leave_employee_dates ON hr_leave_requests(employee_id, start_date, end_date);

-- hr_expenses
CREATE INDEX idx_expenses_workspace_status ON hr_expenses(workspace_id, status);

-- erp_stock_movements
CREATE INDEX idx_stock_product_created ON erp_stock_movements(product_id, created_at);
```

**Frontend:**

- Bundle analysis (`npx vite-bundle-visualizer`): identify and lazy-load any chunks > 100KB
- Add `React.lazy` + `Suspense` to: `AIChatPanel`, `BillingPage`, `ReportsPage`
- Add `react-window` or `TanStack Virtual` to any list rendering > 100 rows (board items, product list, employee list)
- `useMemo` / `useCallback` audit on expensive board drag-and-drop handlers

#### 6.3 E2E Test Suite (Playwright)

**Critical flows (must pass on every CI run):**

```
tests/e2e/
├── auth/
│   ├── login.spec.ts            # login → dashboard → logout
│   ├── verify-email.spec.ts     # register → check verify page → resend
│   └── token-refresh.spec.ts    # expire token → make request → auto-refresh
├── erp/
│   ├── invoice-lifecycle.spec.ts  # create → send → record payment → paid
│   ├── so-to-invoice.spec.ts      # create SO → approve → convert → invoice created
│   └── pdf-generation.spec.ts    # create invoice → generate PDF → download URL works
├── hr/
│   ├── leave-request.spec.ts    # request → approve → balance updated
│   ├── expense-submit.spec.ts   # create → upload receipt → submit → approve → reimburse
│   └── attendance.spec.ts       # clock in → clock out → duration correct
├── boards/
│   ├── column-management.spec.ts  # add → rename → reorder → delete column
│   ├── subitems.spec.ts           # create item → add subitems → verify count
│   └── activity-feed.spec.ts      # update item → open activity → change shown
├── crm/
│   └── pipeline.spec.ts         # create deal → move stages → convert
├── notifications/
│   └── realtime.spec.ts         # trigger backend event → notification appears < 2s
└── reports/
    └── csv-export.spec.ts       # request export → poll → download → verify CSV
```

All E2E tests run against a seeded test database using `php artisan db:seed --class=TestSeeder`.

#### 6.4 Security Re-Audit

**Checklist:**

- [ ] All routes under `auth:sanctum` middleware
- [ ] All routes under `workspace` middleware (scopes DB queries to current workspace)
- [ ] Every controller method calls `$this->authorize()` before querying
- [ ] No raw user input interpolated into SQL (use Eloquent or `DB::select()` with bindings)
- [ ] File uploads: validate MIME type server-side (not just extension), scan with ClamAV or mime-type check
- [ ] Rate limiting on: `/api/v1/auth/login` (5/min), `/api/v1/auth/email/resend` (3/hour), `/api/v1/ai/*` (per-credit-balance)
- [ ] IDOR check: every `show`/`update`/`delete` endpoint confirms resource belongs to the authenticated user's workspace
- [ ] PayFast ITN endpoint: validate signature, validate amount, validate merchant ID before updating subscription
- [ ] CSRF protection on all state-changing requests (Sanctum SPA with cookie handles this)
- [ ] Audit log covers all sensitive actions
- [ ] Secrets not logged (mask `password`, `token`, `secret` in log channels)

**IDOR test pattern:**

```php
// In every feature test for show/update/delete:
public function test_cannot_access_other_workspace_resource(): void
{
    $otherWorkspace = Workspace::factory()->create();
    $resource = Resource::factory()->for($otherWorkspace)->create();
    $response = $this->actingAs($this->user)->getJson("/api/v1/resource/{$resource->id}");
    $response->assertForbidden();
}
```

#### 6.5 Backend Test Coverage — 80% Gate

Run `php artisan test --coverage --min=80`. Fix any controllers or services below 80%.

**Priority areas if coverage is low:**
1. `InvoiceService` — edge cases (void, overpayment, overdue marking)
2. `LeaveService` — balance edge cases (balance = exactly requested days, zero balance)
3. `AccountingService` — unbalanced entry rejection, account type balance rules
4. `AutomationService` — trigger evaluation with multiple conditions

#### 6.6 Lighthouse Score > 90

Run Lighthouse CI on these pages: Dashboard, Board view, Invoice list, HR leave requests, Reports dashboard.

Fix issues typically found:
- Images missing `width`/`height` attributes (CLS)
- Render-blocking scripts (defer/async)
- Missing meta descriptions
- Non-passive event listeners on scroll

---

### S6 Acceptance Criteria

- [ ] All 30+ E2E tests pass in CI
- [ ] `php artisan test --coverage` reports ≥ 80% coverage
- [ ] All new list endpoints return < 200ms at 1,000 records (measured in CI with seeded DB)
- [ ] Report dashboard endpoint returns < 1s cold, < 50ms cached
- [ ] PDF generation job completes < 5s (measured in CI with Gotenberg container)
- [ ] Lighthouse score ≥ 90 on Dashboard, Board, Invoice List, Reports pages
- [ ] IDOR tests pass for all resource types (Invoice, PO, SO, Employee, LeaveRequest, Expense, Meeting)
- [ ] Zero `dd()`, `var_dump()`, or `console.log()` in production code
- [ ] `npm run build` produces no TypeScript errors
- [ ] `php artisan migrate:fresh --seed` + `php artisan test` green in CI

---

## Performance Requirements

| Endpoint / Action | Requirement | Measurement Method |
|---|---|---|
| All list endpoints (1,000 records) | < 200ms | Seeded DB benchmark in CI |
| All single-resource GET endpoints | < 100ms | Seeded DB benchmark |
| PDF generation (invoice) | < 5s | Job completion time |
| Report dashboard (cold) | < 1s | Response time with cold Redis |
| Report dashboard (warm) | < 50ms | Response time with warm Redis |
| Real-time notification delivery | < 100ms | WebSocket round-trip test |
| File upload (10MB to S3) | < 15s | E2E upload timing |
| p95 API response time (all endpoints) | < 300ms | Load test with k6 (100 VU, 60s) |
| Frontend bundle (initial JS) | < 500KB gzipped | Vite bundle analyzer |
| Lighthouse Performance score | > 90 | Lighthouse CI |
| Time to Interactive (Dashboard) | < 3s | Lighthouse CI |

**k6 load test script location:** `tests/load/api-smoke.js`

---

## Deployment Checklist

### Environment Variables to Add

```bash
# Gotenberg
GOTENBERG_URL=http://gotenberg:3000

# AWS / MinIO
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=af-south-1
AWS_BUCKET=aquerii-uploads
AWS_ENDPOINT=                          # MinIO only
AWS_USE_PATH_STYLE_ENDPOINT=true       # MinIO only

# Laravel Reverb (WebSocket)
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_HOST=0.0.0.0
REVERB_PORT=8080
REVERB_SCHEME=https

# Frontend (Vite)
VITE_REVERB_APP_KEY=
VITE_REVERB_HOST=
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https

# PayFast
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
PAYFAST_SANDBOX=false
PAYFAST_ITN_URL=https://your-domain.com/api/v1/billing/payfast/itn

# Redis (Horizon + Cache + Broadcast)
REDIS_HOST=
REDIS_PASSWORD=
REDIS_PORT=6379

# Queue
QUEUE_CONNECTION=redis
BROADCAST_DRIVER=reverb
CACHE_DRIVER=redis
SESSION_DRIVER=redis
```

### Queue Workers — Supervisord Configuration

```ini
; /etc/supervisor/conf.d/aquerii-horizon.conf
[program:aquerii-horizon]
process_name=%(program_name)s
command=php /var/www/artisan horizon
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/aquerii/horizon.log
stopwaitsecs=3600

; /etc/supervisor/conf.d/aquerii-reverb.conf
[program:aquerii-reverb]
process_name=%(program_name)s
command=php /var/www/artisan reverb:start --host=0.0.0.0 --port=8080
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/aquerii/reverb.log
```

### Migrations — Run Order

```bash
# 1. Run all new migrations
php artisan migrate --force

# 2. Verify no failed migrations
php artisan migrate:status

# 3. If rollback needed (staging only):
php artisan migrate:rollback --step=25
```

**Critical:** Migrations are sequential by timestamp. Do not run `migrate:fresh` in production. Always `migrate`.

### Post-Deploy Commands

```bash
# 1. Clear and rebuild caches
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 2. Restart queue workers
php artisan horizon:terminate  # Supervisor will restart it

# 3. Restart Reverb
supervisorctl restart aquerii-reverb

# 4. Warm report caches (optional but recommended)
php artisan reports:warm-cache

# 5. Verify Horizon is running
php artisan horizon:status
```

### Cache Warming

```bash
# app/Console/Commands/WarmReportCachesCommand.php
# Runs: php artisan reports:warm-cache
# Iterates over all active workspaces and pre-populates:
# - reports:dashboard:{workspaceId}
# - reports:inventory:{workspaceId}
```

---

## Definition of Done — 10/10

A feature is **not done** until every item in this list is checked.

### Per-Feature DoD

- [ ] All routes defined and registered
- [ ] Controller methods thin (delegate to service)
- [ ] FormRequest validation class with all rules
- [ ] Policy gate called in every controller action
- [ ] IDOR protection verified (cross-workspace access returns 403)
- [ ] Correct HTTP status codes (200, 201, 204, 400, 401, 403, 404, 409, 422)
- [ ] Response uses standard envelope (`{ data, meta, message }`)
- [ ] No N+1 queries (verified in Telescope/Debugbar)
- [ ] Pagination on all list endpoints
- [ ] Feature test written and passing
- [ ] IDOR test written and passing
- [ ] API documented (in Postman collection or OpenAPI spec)

### System-Wide DoD — 10/10 Checklist

**Backend correctness:**
- [ ] Every route in this document returns correct data
- [ ] All status-flow state machines enforced (cannot skip states)
- [ ] All async jobs idempotent (safe to retry)
- [ ] All scheduled commands registered in `Kernel.php`
- [ ] `php artisan migrate:fresh --seed && php artisan test` passes with no failures

**Frontend correctness:**
- [ ] Every frontend page renders correct data (no hardcoded stubs)
- [ ] Loading states shown while API calls are in-flight
- [ ] Error states shown when API calls fail (with retry option)
- [ ] Empty states shown when lists have no data
- [ ] All forms validate inline before submission
- [ ] `npm run build` produces zero TypeScript errors
- [ ] `npm run test` passes with no failures

**Security:**
- [ ] Zero IDOR/auth bypass vulnerabilities (verified by systematic IDOR test suite)
- [ ] Zero unvalidated file uploads (MIME + size validated server-side)
- [ ] Rate limiting on auth and AI endpoints
- [ ] PayFast ITN signature validated before any DB write
- [ ] No secrets in logs, no secrets in frontend bundle
- [ ] All sensitive operations in audit log
- [ ] OWASP Top 10 checklist reviewed and signed off

**Test coverage:**
- [ ] ≥ 80% backend test coverage (`php artisan test --coverage --min=80`)
- [ ] All 30+ E2E flows pass in CI
- [ ] All IDOR tests pass (one per resource type)
- [ ] Load test passes at 100 concurrent users

**Performance:**
- [ ] All list endpoints < 200ms at 1,000 records
- [ ] PDF generation < 5s
- [ ] Report dashboard < 1s cold, < 50ms cached
- [ ] p95 API response time < 300ms under load
- [ ] Lighthouse score > 90 on all key pages
- [ ] Initial JS bundle < 500KB gzipped

**Deployment:**
- [ ] All environment variables documented and set in production
- [ ] Horizon running and processing all queues
- [ ] Reverb running and accepting WebSocket connections
- [ ] All migrations applied cleanly
- [ ] Post-deploy caches warmed
- [ ] Monitoring/alerting configured (Horizon failed jobs alert, error rate alert)
- [ ] Rollback plan documented and tested on staging

---

*Document version: 1.0 — Sprint-ready for developer assignment*
*Last updated: Sprint 0 (pre-kickoff)*
*Owner: Engineering Lead*
