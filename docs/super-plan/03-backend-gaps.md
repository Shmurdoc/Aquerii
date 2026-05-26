# Backend Gap Implementation Plan

> **Scope:** Every module listed here has a complete frontend API client and UI but zero backend routes, controllers, or migrations. This document is the authoritative implementation spec. Follow it exactly.

---

## Table of Contents

1. [ERP — Invoicing](#1-erp--invoicing)
2. [ERP — Purchase Orders](#2-erp--purchase-orders)
3. [ERP — Sales Orders](#3-erp--sales-orders)
4. [ERP — Inventory](#4-erp--inventory)
5. [ERP — Accounting](#5-erp--accounting)
6. [HR — Employees](#6-hr--employees)
7. [HR — Attendance](#7-hr--attendance)
8. [HR — Leave](#8-hr--leave)
9. [HR — Expenses](#9-hr--expenses)
10. [Meetings](#10-meetings)
11. [Reports](#11-reports)
12. [Automations — Templates](#12-automations--templates)
13. [Settings — Missing Routes](#13-settings--missing-routes)
14. [Auth — Missing Routes](#14-auth--missing-routes)

---

## 1. ERP — Invoicing

### 1.1 Database Migrations

```php
// database/migrations/xxxx_create_invoices_table.php
Schema::create('invoices', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('sales_order_id')->nullable()->constrained()->nullOnDelete();
    $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
    $table->string('invoice_number')->unique();
    $table->enum('status', ['draft', 'sent', 'paid', 'overdue', 'cancelled'])->default('draft');
    $table->string('currency', 3)->default('USD');
    $table->foreignId('client_id')->nullable()->constrained('workspace_clients')->nullOnDelete();
    $table->string('client_name');
    $table->text('client_address')->nullable();
    $table->string('client_email')->nullable();
    $table->date('issue_date');
    $table->date('due_date');
    $table->text('notes')->nullable();
    $table->text('terms')->nullable();
    $table->decimal('subtotal', 15, 2)->default(0);
    $table->decimal('tax_amount', 15, 2)->default(0);
    $table->decimal('discount_amount', 15, 2)->default(0);
    $table->decimal('total', 15, 2)->default(0);
    $table->timestamp('sent_at')->nullable();
    $table->timestamp('paid_at')->nullable();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['workspace_id', 'status']);
    $table->index(['workspace_id', 'due_date']);
});

// database/migrations/xxxx_create_invoice_line_items_table.php
Schema::create('invoice_line_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
    $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
    $table->string('description');
    $table->decimal('quantity', 15, 4)->default(1);
    $table->string('unit')->nullable();
    $table->decimal('unit_price', 15, 2);
    $table->decimal('tax_rate', 5, 2)->default(0);  // percentage
    $table->decimal('discount_rate', 5, 2)->default(0); // percentage
    $table->decimal('line_total', 15, 2);
    $table->integer('sort_order')->default(0);
    $table->timestamps();

    $table->index('invoice_id');
});
```

### 1.2 Eloquent Models

```php
// app/Models/Invoice.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Invoice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'workspace_id', 'sales_order_id', 'created_by', 'invoice_number',
        'status', 'currency', 'client_id', 'client_name', 'client_address',
        'client_email', 'issue_date', 'due_date', 'notes', 'terms',
        'subtotal', 'tax_amount', 'discount_amount', 'total',
        'sent_at', 'paid_at',
    ];

    protected $casts = [
        'issue_date'      => 'date',
        'due_date'        => 'date',
        'sent_at'         => 'datetime',
        'paid_at'         => 'datetime',
        'subtotal'        => 'decimal:2',
        'tax_amount'      => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total'           => 'decimal:2',
    ];

    // Relationships
    public function workspace(): BelongsTo { return $this->belongsTo(Workspace::class); }
    public function salesOrder(): BelongsTo  { return $this->belongsTo(SalesOrder::class); }
    public function creator(): BelongsTo     { return $this->belongsTo(User::class, 'created_by'); }
    public function lineItems(): HasMany      { return $this->hasMany(InvoiceLineItem::class)->orderBy('sort_order'); }

    // Scopes
    public function scopeForWorkspace(Builder $q, int $workspaceId): Builder
    {
        return $q->where('workspace_id', $workspaceId);
    }

    public function scopeOverdue(Builder $q): Builder
    {
        return $q->where('status', 'sent')->where('due_date', '<', now());
    }

    // Helpers
    public function recalculateTotals(): void
    {
        $this->subtotal        = $this->lineItems->sum('line_total');
        $this->tax_amount      = $this->lineItems->sum(fn ($i) => $i->line_total * $i->tax_rate / 100);
        $this->discount_amount = $this->lineItems->sum(fn ($i) => $i->line_total * $i->discount_rate / 100);
        $this->total           = $this->subtotal + $this->tax_amount - $this->discount_amount;
        $this->save();
    }

    public static function nextNumber(int $workspaceId): string
    {
        $last = static::where('workspace_id', $workspaceId)
            ->withTrashed()
            ->max('invoice_number');
        $seq = $last ? ((int) substr($last, -6)) + 1 : 1;
        return 'INV-' . str_pad($seq, 6, '0', STR_PAD_LEFT);
    }
}

// app/Models/InvoiceLineItem.php
class InvoiceLineItem extends Model
{
    protected $fillable = [
        'invoice_id', 'product_id', 'description', 'quantity',
        'unit', 'unit_price', 'tax_rate', 'discount_rate', 'line_total', 'sort_order',
    ];

    protected $casts = [
        'quantity'      => 'decimal:4',
        'unit_price'    => 'decimal:2',
        'tax_rate'      => 'decimal:2',
        'discount_rate' => 'decimal:2',
        'line_total'    => 'decimal:2',
    ];

    public function invoice(): BelongsTo  { return $this->belongsTo(Invoice::class); }
    public function product(): BelongsTo  { return $this->belongsTo(Product::class); }
}
```

### 1.3 Controller

```php
// app/Http/Controllers/Api/Erp/InvoiceController.php
namespace App\Http\Controllers\Api\Erp;

use App\Http\Controllers\Controller;
use App\Http\Requests\Erp\StoreInvoiceRequest;
use App\Http\Requests\Erp\UpdateInvoiceRequest;
use App\Models\Invoice;
use App\Models\Workspace;
use App\Services\Erp\InvoicePdfService;
use App\Services\Erp\InvoiceMailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InvoiceController extends Controller
{
    public function __construct(
        private InvoicePdfService  $pdfService,
        private InvoiceMailService $mailService,
    ) {}

    /** GET /workspaces/{workspace}/invoices */
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('viewAny', [Invoice::class, $workspace]);

        $invoices = Invoice::forWorkspace($workspace->id)
            ->with(['creator', 'lineItems'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->search, fn ($q, $s) => $q->where('invoice_number', 'like', "%{$s}%")
                ->orWhere('client_name', 'like', "%{$s}%"))
            ->latest()
            ->paginate($request->integer('per_page', 25));

        return response()->json($invoices);
    }

    /** POST /workspaces/{workspace}/invoices */
    public function store(StoreInvoiceRequest $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('create', [Invoice::class, $workspace]);

        $invoice = \DB::transaction(function () use ($request, $workspace) {
            $invoice = Invoice::create([
                ...$request->validated(),
                'workspace_id'   => $workspace->id,
                'created_by'     => auth()->id(),
                'invoice_number' => Invoice::nextNumber($workspace->id),
            ]);

            foreach ($request->validated('line_items', []) as $idx => $item) {
                $lineTotal = $item['quantity'] * $item['unit_price'];
                $invoice->lineItems()->create([...$item, 'line_total' => $lineTotal, 'sort_order' => $idx]);
            }

            $invoice->recalculateTotals();
            return $invoice->fresh('lineItems');
        });

        return response()->json($invoice, 201);
    }

    /** GET /workspaces/{workspace}/invoices/{invoice} */
    public function show(Workspace $workspace, Invoice $invoice): JsonResponse
    {
        $this->authorize('view', $invoice);
        return response()->json($invoice->load('lineItems', 'creator', 'salesOrder'));
    }

    /** PATCH /workspaces/{workspace}/invoices/{invoice} */
    public function update(UpdateInvoiceRequest $request, Workspace $workspace, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $invoice);

        \DB::transaction(function () use ($request, $invoice) {
            $invoice->update($request->validated());

            if ($request->has('line_items')) {
                $invoice->lineItems()->delete();
                foreach ($request->validated('line_items', []) as $idx => $item) {
                    $lineTotal = $item['quantity'] * $item['unit_price'];
                    $invoice->lineItems()->create([...$item, 'line_total' => $lineTotal, 'sort_order' => $idx]);
                }
                $invoice->recalculateTotals();
            }
        });

        return response()->json($invoice->fresh('lineItems'));
    }

    /** DELETE /workspaces/{workspace}/invoices/{invoice} */
    public function destroy(Workspace $workspace, Invoice $invoice): Response
    {
        $this->authorize('delete', $invoice);
        $invoice->delete();
        return response()->noContent();
    }

    /** GET /workspaces/{workspace}/invoices/{invoice}/pdf */
    public function pdf(Workspace $workspace, Invoice $invoice): Response
    {
        $this->authorize('view', $invoice);
        $pdfContent = $this->pdfService->generate($invoice);
        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$invoice->invoice_number}.pdf\"",
        ]);
    }

    /** POST /workspaces/{workspace}/invoices/{invoice}/send */
    public function send(Workspace $workspace, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $invoice);
        $this->mailService->send($invoice);
        $invoice->update(['status' => 'sent', 'sent_at' => now()]);
        return response()->json(['message' => 'Invoice sent successfully.']);
    }

    /** POST /workspaces/{workspace}/invoices/{invoice}/mark-paid */
    public function markPaid(Workspace $workspace, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $invoice);
        $invoice->update(['status' => 'paid', 'paid_at' => now()]);
        return response()->json($invoice);
    }
}
```

### 1.4 Form Request Validation

```php
// app/Http/Requests/Erp/StoreInvoiceRequest.php
class StoreInvoiceRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'client_name'              => ['required', 'string', 'max:255'],
            'client_address'           => ['nullable', 'string'],
            'client_email'             => ['nullable', 'email', 'max:255'],
            'client_id'                => ['nullable', 'integer', 'exists:workspace_clients,id'],
            'currency'                 => ['required', 'string', 'size:3'],
            'issue_date'               => ['required', 'date'],
            'due_date'                 => ['required', 'date', 'after_or_equal:issue_date'],
            'notes'                    => ['nullable', 'string'],
            'terms'                    => ['nullable', 'string'],
            'status'                   => ['sometimes', 'in:draft,sent'],
            'line_items'               => ['required', 'array', 'min:1'],
            'line_items.*.description' => ['required', 'string', 'max:500'],
            'line_items.*.quantity'    => ['required', 'numeric', 'min:0.0001'],
            'line_items.*.unit'        => ['nullable', 'string', 'max:50'],
            'line_items.*.unit_price'  => ['required', 'numeric', 'min:0'],
            'line_items.*.tax_rate'    => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'line_items.*.discount_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'line_items.*.product_id'  => ['nullable', 'integer', 'exists:products,id'],
        ];
    }
}
```

### 1.5 PDF Generation — Gotenberg Integration

```php
// app/Services/Erp/InvoicePdfService.php
namespace App\Services\Erp;

use App\Models\Invoice;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\View;

class InvoicePdfService
{
    private string $gotenbergUrl;

    public function __construct()
    {
        $this->gotenbergUrl = rtrim(config('services.gotenberg.url'), '/');
    }

    public function generate(Invoice $invoice): string
    {
        $html = View::make('pdf.invoice', ['invoice' => $invoice->load('lineItems')])->render();

        $response = Http::attach('files', $html, 'index.html', ['Content-Type' => 'text/html'])
            ->post("{$this->gotenbergUrl}/forms/chromium/convert/html", [
                'marginTop'    => '0.5in',
                'marginBottom' => '0.5in',
                'marginLeft'   => '0.5in',
                'marginRight'  => '0.5in',
                'paperWidth'   => '8.27',   // A4
                'paperHeight'  => '11.69',
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Gotenberg PDF generation failed: ' . $response->body());
        }

        return $response->body();
    }
}
```

Add to `config/services.php`:
```php
'gotenberg' => [
    'url' => env('GOTENBERG_URL', 'http://gotenberg:3000'),
],
```

### 1.6 SO → Invoice Conversion

```php
// app/Services/Erp/SalesOrderToInvoiceService.php
namespace App\Services\Erp;

use App\Models\SalesOrder;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;

class SalesOrderToInvoiceService
{
    public function convert(SalesOrder $order): Invoice
    {
        return DB::transaction(function () use ($order) {
            $invoice = Invoice::create([
                'workspace_id'   => $order->workspace_id,
                'sales_order_id' => $order->id,
                'created_by'     => auth()->id(),
                'invoice_number' => Invoice::nextNumber($order->workspace_id),
                'status'         => 'draft',
                'currency'       => $order->currency,
                'client_name'    => $order->client_name,
                'client_address' => $order->client_address,
                'client_email'   => $order->client_email,
                'client_id'      => $order->client_id,
                'issue_date'     => now()->toDateString(),
                'due_date'       => now()->addDays(30)->toDateString(),
                'notes'          => $order->notes,
            ]);

            foreach ($order->lineItems as $idx => $item) {
                $lineTotal = $item->quantity * $item->unit_price;
                $invoice->lineItems()->create([
                    'product_id'    => $item->product_id,
                    'description'   => $item->description,
                    'quantity'      => $item->quantity,
                    'unit'          => $item->unit,
                    'unit_price'    => $item->unit_price,
                    'tax_rate'      => $item->tax_rate,
                    'discount_rate' => $item->discount_rate,
                    'line_total'    => $lineTotal,
                    'sort_order'    => $idx,
                ]);
            }

            $invoice->recalculateTotals();
            $order->update(['status' => 'invoiced']);

            return $invoice->fresh('lineItems');
        });
    }
}

// app/Http/Controllers/Api/Erp/SalesOrderConversionController.php
class SalesOrderConversionController extends Controller
{
    public function __construct(private SalesOrderToInvoiceService $service) {}

    /** POST /workspaces/{workspace}/sales/orders/{order}/convert-to-invoice */
    public function __invoke(Workspace $workspace, SalesOrder $order): JsonResponse
    {
        $this->authorize('update', $order);
        abort_if($order->status === 'invoiced', 422, 'Order has already been invoiced.');

        $invoice = $this->service->convert($order);
        return response()->json($invoice, 201);
    }
}
```

### 1.7 Authorization Policy

```php
// app/Policies/InvoicePolicy.php
namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;
use App\Models\Workspace;

class InvoicePolicy
{
    public function viewAny(User $user, Workspace $workspace): bool
    {
        return $user->belongsToWorkspace($workspace);
    }

    public function view(User $user, Invoice $invoice): bool
    {
        return $user->belongsToWorkspace($invoice->workspace_id);
    }

    public function create(User $user, Workspace $workspace): bool
    {
        return $user->hasWorkspaceRole($workspace, ['admin', 'accountant']);
    }

    public function update(User $user, Invoice $invoice): bool
    {
        return $user->hasWorkspaceRole($invoice->workspace, ['admin', 'accountant'])
            && $invoice->status !== 'paid';
    }

    public function delete(User $user, Invoice $invoice): bool
    {
        return $user->hasWorkspaceRole($invoice->workspace, ['admin'])
            && $invoice->status === 'draft';
    }
}
```

### 1.8 Route Registration

```php
// In routes/api.php — inside Route::prefix('workspaces/{workspace}') group
Route::prefix('invoices')->group(function () {
    Route::get('/',                                    [InvoiceController::class, 'index']);
    Route::post('/',                                   [InvoiceController::class, 'store']);
    Route::get('/{invoice}',                           [InvoiceController::class, 'show']);
    Route::patch('/{invoice}',                         [InvoiceController::class, 'update']);
    Route::delete('/{invoice}',                        [InvoiceController::class, 'destroy']);
    Route::get('/{invoice}/pdf',                       [InvoiceController::class, 'pdf']);
    Route::post('/{invoice}/send',                     [InvoiceController::class, 'send']);
    Route::post('/{invoice}/mark-paid',                [InvoiceController::class, 'markPaid']);
});

Route::post(
    '/sales/orders/{order}/convert-to-invoice',
    SalesOrderConversionController::class
);
```

---

## 2. ERP — Purchase Orders

### 2.1 Migration

```php
Schema::create('purchase_orders', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
    $table->string('po_number')->unique();
    $table->enum('status', ['draft', 'sent', 'approved', 'received', 'cancelled'])->default('draft');
    $table->string('supplier_name');
    $table->string('supplier_email')->nullable();
    $table->text('supplier_address')->nullable();
    $table->string('currency', 3)->default('USD');
    $table->date('order_date');
    $table->date('expected_delivery_date')->nullable();
    $table->text('notes')->nullable();
    $table->decimal('subtotal', 15, 2)->default(0);
    $table->decimal('tax_amount', 15, 2)->default(0);
    $table->decimal('total', 15, 2)->default(0);
    $table->timestamps();
    $table->softDeletes();

    $table->index(['workspace_id', 'status']);
});

Schema::create('purchase_order_line_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
    $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
    $table->string('description');
    $table->decimal('quantity', 15, 4);
    $table->string('unit')->nullable();
    $table->decimal('unit_price', 15, 2);
    $table->decimal('tax_rate', 5, 2)->default(0);
    $table->decimal('line_total', 15, 2);
    $table->integer('sort_order')->default(0);
    $table->timestamps();
});
```

### 2.2 Model

```php
// app/Models/PurchaseOrder.php
class PurchaseOrder extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'workspace_id', 'created_by', 'po_number', 'status', 'supplier_name',
        'supplier_email', 'supplier_address', 'currency', 'order_date',
        'expected_delivery_date', 'notes', 'subtotal', 'tax_amount', 'total',
    ];

    protected $casts = [
        'order_date'               => 'date',
        'expected_delivery_date'   => 'date',
        'subtotal'                 => 'decimal:2',
        'tax_amount'               => 'decimal:2',
        'total'                    => 'decimal:2',
    ];

    public function workspace(): BelongsTo { return $this->belongsTo(Workspace::class); }
    public function creator(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
    public function lineItems(): HasMany   { return $this->hasMany(PurchaseOrderLineItem::class)->orderBy('sort_order'); }

    public function scopeForWorkspace(Builder $q, int $id): Builder { return $q->where('workspace_id', $id); }

    public static function nextNumber(int $workspaceId): string
    {
        $last = static::where('workspace_id', $workspaceId)->withTrashed()->max('po_number');
        $seq  = $last ? ((int) substr($last, -6)) + 1 : 1;
        return 'PO-' . str_pad($seq, 6, '0', STR_PAD_LEFT);
    }
}
```

### 2.3 Controller

```php
// app/Http/Controllers/Api/Erp/PurchaseOrderController.php
class PurchaseOrderController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse { /* paginated list */ }
    public function store(StorePurchaseOrderRequest $request, Workspace $workspace): JsonResponse { /* create + line items */ }
    public function show(Workspace $workspace, PurchaseOrder $order): JsonResponse { /* load line items */ }
    public function update(UpdatePurchaseOrderRequest $request, Workspace $workspace, PurchaseOrder $order): JsonResponse { /* sync line items */ }
    public function destroy(Workspace $workspace, PurchaseOrder $order): Response { /* soft delete */ }
}
```

### 2.4 Validation — `StorePurchaseOrderRequest`

```php
public function rules(): array
{
    return [
        'supplier_name'                => ['required', 'string', 'max:255'],
        'supplier_email'               => ['nullable', 'email'],
        'supplier_address'             => ['nullable', 'string'],
        'currency'                     => ['required', 'string', 'size:3'],
        'order_date'                   => ['required', 'date'],
        'expected_delivery_date'       => ['nullable', 'date', 'after_or_equal:order_date'],
        'notes'                        => ['nullable', 'string'],
        'status'                       => ['sometimes', 'in:draft,sent'],
        'line_items'                   => ['required', 'array', 'min:1'],
        'line_items.*.description'     => ['required', 'string', 'max:500'],
        'line_items.*.quantity'        => ['required', 'numeric', 'min:0.0001'],
        'line_items.*.unit'            => ['nullable', 'string', 'max:50'],
        'line_items.*.unit_price'      => ['required', 'numeric', 'min:0'],
        'line_items.*.tax_rate'        => ['sometimes', 'numeric', 'min:0', 'max:100'],
        'line_items.*.product_id'      => ['nullable', 'integer', 'exists:products,id'],
    ];
}
```

### 2.5 Policy

```php
// app/Policies/PurchaseOrderPolicy.php
// viewAny/view: belongs to workspace
// create/update/delete: admin or purchasing role
```

### 2.6 Routes

```php
Route::apiResource('purchases/orders', PurchaseOrderController::class)
    ->parameters(['orders' => 'order']);
```

---

## 3. ERP — Sales Orders

### 3.1 Migration

```php
Schema::create('sales_orders', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
    $table->string('so_number')->unique();
    $table->enum('status', ['draft', 'confirmed', 'shipped', 'invoiced', 'cancelled'])->default('draft');
    $table->foreignId('client_id')->nullable()->constrained('workspace_clients')->nullOnDelete();
    $table->string('client_name');
    $table->string('client_email')->nullable();
    $table->text('client_address')->nullable();
    $table->string('currency', 3)->default('USD');
    $table->date('order_date');
    $table->date('expected_ship_date')->nullable();
    $table->text('notes')->nullable();
    $table->decimal('subtotal', 15, 2)->default(0);
    $table->decimal('tax_amount', 15, 2)->default(0);
    $table->decimal('discount_amount', 15, 2)->default(0);
    $table->decimal('total', 15, 2)->default(0);
    $table->timestamps();
    $table->softDeletes();

    $table->index(['workspace_id', 'status']);
});

Schema::create('sales_order_line_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('sales_order_id')->constrained()->cascadeOnDelete();
    $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
    $table->string('description');
    $table->decimal('quantity', 15, 4);
    $table->string('unit')->nullable();
    $table->decimal('unit_price', 15, 2);
    $table->decimal('tax_rate', 5, 2)->default(0);
    $table->decimal('discount_rate', 5, 2)->default(0);
    $table->decimal('line_total', 15, 2);
    $table->integer('sort_order')->default(0);
    $table->timestamps();
});
```

### 3.2 Model

```php
// app/Models/SalesOrder.php
class SalesOrder extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'workspace_id', 'created_by', 'so_number', 'status', 'client_id',
        'client_name', 'client_email', 'client_address', 'currency',
        'order_date', 'expected_ship_date', 'notes',
        'subtotal', 'tax_amount', 'discount_amount', 'total',
    ];

    protected $casts = [
        'order_date'         => 'date',
        'expected_ship_date' => 'date',
        'subtotal'           => 'decimal:2',
        'tax_amount'         => 'decimal:2',
        'discount_amount'    => 'decimal:2',
        'total'              => 'decimal:2',
    ];

    public function workspace(): BelongsTo { return $this->belongsTo(Workspace::class); }
    public function creator(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
    public function lineItems(): HasMany   { return $this->hasMany(SalesOrderLineItem::class)->orderBy('sort_order'); }
    public function invoice(): HasOne      { return $this->hasOne(Invoice::class); }

    public function scopeForWorkspace(Builder $q, int $id): Builder { return $q->where('workspace_id', $id); }

    public static function nextNumber(int $workspaceId): string
    {
        $last = static::where('workspace_id', $workspaceId)->withTrashed()->max('so_number');
        $seq  = $last ? ((int) substr($last, -6)) + 1 : 1;
        return 'SO-' . str_pad($seq, 6, '0', STR_PAD_LEFT);
    }
}
```

### 3.3 Controller

```php
// app/Http/Controllers/Api/Erp/SalesOrderController.php
class SalesOrderController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse { /* paginated, filterable by status */ }
    public function store(StoreSalesOrderRequest $request, Workspace $workspace): JsonResponse { /* create with line items */ }
    public function show(Workspace $workspace, SalesOrder $order): JsonResponse { /* with line items + invoice */ }
    public function update(UpdateSalesOrderRequest $request, Workspace $workspace, SalesOrder $order): JsonResponse { /* update, block if invoiced */ }
    public function destroy(Workspace $workspace, SalesOrder $order): Response { /* soft delete, block if invoiced */ }
}
```

### 3.4 Routes

```php
Route::apiResource('sales/orders', SalesOrderController::class)
    ->parameters(['orders' => 'order']);
```

---

## 4. ERP — Inventory

### 4.1 Migrations

```php
Schema::create('inventory_categories', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->text('description')->nullable();
    $table->foreignId('parent_id')->nullable()->constrained('inventory_categories')->nullOnDelete();
    $table->timestamps();

    $table->index(['workspace_id', 'parent_id']);
});

Schema::create('products', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('category_id')->nullable()->constrained('inventory_categories')->nullOnDelete();
    $table->string('sku')->nullable();
    $table->string('name');
    $table->text('description')->nullable();
    $table->string('unit')->default('pcs');
    $table->decimal('cost_price', 15, 2)->default(0);
    $table->decimal('sale_price', 15, 2)->default(0);
    $table->decimal('tax_rate', 5, 2)->default(0);
    $table->boolean('is_active')->default(true);
    $table->boolean('track_inventory')->default(true);
    $table->decimal('reorder_level', 15, 4)->default(0);
    $table->timestamps();
    $table->softDeletes();

    $table->unique(['workspace_id', 'sku']);
    $table->index(['workspace_id', 'category_id']);
});

Schema::create('stock_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('product_id')->constrained()->cascadeOnDelete();
    $table->string('location')->nullable();
    $table->string('batch_number')->nullable();
    $table->decimal('quantity', 15, 4)->default(0);
    $table->decimal('reserved_quantity', 15, 4)->default(0);
    $table->date('expiry_date')->nullable();
    $table->enum('transaction_type', ['in', 'out', 'adjustment'])->default('in');
    $table->text('notes')->nullable();
    $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
    $table->timestamps();

    $table->index(['workspace_id', 'product_id']);
    $table->index(['product_id', 'transaction_type']);
});
```

### 4.2 Models

```php
// app/Models/InventoryCategory.php
class InventoryCategory extends Model
{
    protected $fillable = ['workspace_id', 'name', 'description', 'parent_id'];
    public function workspace(): BelongsTo { return $this->belongsTo(Workspace::class); }
    public function parent(): BelongsTo    { return $this->belongsTo(static::class, 'parent_id'); }
    public function children(): HasMany    { return $this->hasMany(static::class, 'parent_id'); }
    public function products(): HasMany    { return $this->hasMany(Product::class, 'category_id'); }
}

// app/Models/Product.php
class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'workspace_id', 'category_id', 'sku', 'name', 'description', 'unit',
        'cost_price', 'sale_price', 'tax_rate', 'is_active', 'track_inventory', 'reorder_level',
    ];

    protected $casts = [
        'cost_price'      => 'decimal:2',
        'sale_price'      => 'decimal:2',
        'tax_rate'        => 'decimal:2',
        'reorder_level'   => 'decimal:4',
        'is_active'       => 'boolean',
        'track_inventory' => 'boolean',
    ];

    public function workspace(): BelongsTo  { return $this->belongsTo(Workspace::class); }
    public function category(): BelongsTo   { return $this->belongsTo(InventoryCategory::class); }
    public function stockItems(): HasMany   { return $this->hasMany(StockItem::class); }

    public function currentStock(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::get(
            fn () => $this->stockItems()
                ->selectRaw("SUM(CASE WHEN transaction_type='in' THEN quantity WHEN transaction_type='out' THEN -quantity ELSE quantity END) as total")
                ->value('total') ?? 0
        );
    }

    public function scopeForWorkspace(Builder $q, int $id): Builder { return $q->where('workspace_id', $id); }
    public function scopeLowStock(Builder $q): Builder
    {
        return $q->where('track_inventory', true)
            ->whereRaw('reorder_level > 0');
    }
}

// app/Models/StockItem.php
class StockItem extends Model
{
    protected $fillable = [
        'workspace_id', 'product_id', 'location', 'batch_number',
        'quantity', 'reserved_quantity', 'expiry_date', 'transaction_type', 'notes', 'created_by',
    ];

    protected $casts = [
        'quantity'          => 'decimal:4',
        'reserved_quantity' => 'decimal:4',
        'expiry_date'       => 'date',
    ];

    public function workspace(): BelongsTo { return $this->belongsTo(Workspace::class); }
    public function product(): BelongsTo   { return $this->belongsTo(Product::class); }
    public function creator(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
}
```

### 4.3 Controllers

```php
// app/Http/Controllers/Api/Erp/InventoryCategoryController.php
class InventoryCategoryController extends Controller
{
    public function index(Workspace $workspace): JsonResponse { /* tree or flat list */ }
    public function store(Request $request, Workspace $workspace): JsonResponse { /* validate name, parent_id */ }
    public function show(Workspace $workspace, InventoryCategory $category): JsonResponse {}
    public function update(Request $request, Workspace $workspace, InventoryCategory $category): JsonResponse {}
    public function destroy(Workspace $workspace, InventoryCategory $category): Response {}
}

// app/Http/Controllers/Api/Erp/ProductController.php
class ProductController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse { /* filter by category, search, active */ }
    public function store(StoreProductRequest $request, Workspace $workspace): JsonResponse {}
    public function show(Workspace $workspace, Product $product): JsonResponse { /* with category, stockItems summary */ }
    public function update(UpdateProductRequest $request, Workspace $workspace, Product $product): JsonResponse {}
    public function destroy(Workspace $workspace, Product $product): Response {}
}

// app/Http/Controllers/Api/Erp/StockItemController.php
class StockItemController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse { /* filter by product */ }
    public function forProduct(Request $request, Workspace $workspace, Product $product): JsonResponse {}
    public function store(StoreStockItemRequest $request, Workspace $workspace): JsonResponse {}
    public function show(Workspace $workspace, StockItem $stockItem): JsonResponse {}
    public function update(Request $request, Workspace $workspace, StockItem $stockItem): JsonResponse {}
    public function destroy(Workspace $workspace, StockItem $stockItem): Response {}
}
```

### 4.4 Routes

```php
Route::apiResource('inventory/categories', InventoryCategoryController::class);
Route::apiResource('inventory/products', ProductController::class);
Route::get('inventory/products/{product}/stock-items', [StockItemController::class, 'forProduct']);
Route::apiResource('inventory/stock-items', StockItemController::class);
```

---

## 5. ERP — Accounting

### 5.1 Migrations

```php
Schema::create('accounts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->string('code', 20);
    $table->string('name');
    $table->enum('type', ['asset', 'liability', 'equity', 'revenue', 'expense']);
    $table->enum('normal_balance', ['debit', 'credit']);
    $table->text('description')->nullable();
    $table->boolean('is_active')->default(true);
    $table->foreignId('parent_id')->nullable()->constrained('accounts')->nullOnDelete();
    $table->timestamps();

    $table->unique(['workspace_id', 'code']);
    $table->index(['workspace_id', 'type']);
});

Schema::create('journal_entries', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
    $table->string('reference')->nullable();
    $table->date('entry_date');
    $table->text('description')->nullable();
    $table->enum('status', ['draft', 'posted', 'reversed'])->default('draft');
    $table->timestamps();

    $table->index(['workspace_id', 'entry_date']);
    $table->index(['workspace_id', 'status']);
});

Schema::create('journal_entry_lines', function (Blueprint $table) {
    $table->id();
    $table->foreignId('journal_entry_id')->constrained()->cascadeOnDelete();
    $table->foreignId('account_id')->constrained()->restrictOnDelete();
    $table->text('description')->nullable();
    $table->decimal('debit', 15, 2)->default(0);
    $table->decimal('credit', 15, 2)->default(0);
    $table->timestamps();

    $table->index('journal_entry_id');
    $table->index('account_id');
});
```

### 5.2 Models

```php
// app/Models/Account.php
class Account extends Model
{
    protected $fillable = ['workspace_id', 'code', 'name', 'type', 'normal_balance', 'description', 'is_active', 'parent_id'];
    protected $casts    = ['is_active' => 'boolean'];

    public function workspace(): BelongsTo   { return $this->belongsTo(Workspace::class); }
    public function parent(): BelongsTo      { return $this->belongsTo(static::class, 'parent_id'); }
    public function children(): HasMany      { return $this->hasMany(static::class, 'parent_id'); }
    public function journalLines(): HasMany  { return $this->hasMany(JournalEntryLine::class); }

    public function scopeForWorkspace(Builder $q, int $id): Builder { return $q->where('workspace_id', $id); }
}

// app/Models/JournalEntry.php
class JournalEntry extends Model
{
    protected $fillable = ['workspace_id', 'created_by', 'reference', 'entry_date', 'description', 'status'];
    protected $casts    = ['entry_date' => 'date'];

    public function workspace(): BelongsTo { return $this->belongsTo(Workspace::class); }
    public function creator(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
    public function lines(): HasMany       { return $this->hasMany(JournalEntryLine::class); }

    public function isBalanced(): bool
    {
        $totals = $this->lines()->selectRaw('SUM(debit) as total_debit, SUM(credit) as total_credit')->first();
        return round($totals->total_debit, 2) === round($totals->total_credit, 2);
    }
}
```

### 5.3 Controller

```php
// app/Http/Controllers/Api/Erp/AccountController.php
class AccountController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse { /* filter by type */ }
    public function store(StoreAccountRequest $request, Workspace $workspace): JsonResponse {}
    public function show(Workspace $workspace, Account $account): JsonResponse {}
    public function update(UpdateAccountRequest $request, Workspace $workspace, Account $account): JsonResponse {}
    public function destroy(Workspace $workspace, Account $account): Response { /* block if has journal lines */ }
}

// app/Http/Controllers/Api/Erp/JournalEntryController.php
class JournalEntryController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse { /* filter by date, status */ }

    /** POST /workspaces/{workspace}/accounting/journal-entries — batch create */
    public function batchStore(BatchJournalEntryRequest $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('create', [JournalEntry::class, $workspace]);

        $entries = DB::transaction(function () use ($request, $workspace) {
            return collect($request->validated('entries'))->map(function ($data) use ($workspace) {
                $entry = JournalEntry::create([...$data, 'workspace_id' => $workspace->id, 'created_by' => auth()->id()]);
                foreach ($data['lines'] as $line) {
                    $entry->lines()->create($line);
                }
                abort_unless($entry->isBalanced(), 422, "Entry {$entry->reference} is not balanced.");
                return $entry->load('lines');
            });
        });

        return response()->json($entries, 201);
    }
}
```

### 5.4 Validation

```php
// StoreAccountRequest
public function rules(): array
{
    return [
        'code'           => ['required', 'string', 'max:20'],
        'name'           => ['required', 'string', 'max:255'],
        'type'           => ['required', 'in:asset,liability,equity,revenue,expense'],
        'normal_balance' => ['required', 'in:debit,credit'],
        'description'    => ['nullable', 'string'],
        'is_active'      => ['boolean'],
        'parent_id'      => ['nullable', 'integer', 'exists:accounts,id'],
    ];
}

// BatchJournalEntryRequest
public function rules(): array
{
    return [
        'entries'                       => ['required', 'array', 'min:1'],
        'entries.*.reference'           => ['nullable', 'string', 'max:100'],
        'entries.*.entry_date'          => ['required', 'date'],
        'entries.*.description'         => ['nullable', 'string'],
        'entries.*.status'              => ['sometimes', 'in:draft,posted'],
        'entries.*.lines'               => ['required', 'array', 'min:2'],
        'entries.*.lines.*.account_id'  => ['required', 'integer', 'exists:accounts,id'],
        'entries.*.lines.*.description' => ['nullable', 'string'],
        'entries.*.lines.*.debit'       => ['required', 'numeric', 'min:0'],
        'entries.*.lines.*.credit'      => ['required', 'numeric', 'min:0'],
    ];
}
```

### 5.5 Routes

```php
Route::apiResource('accounting/accounts', AccountController::class);
Route::get('accounting/journal-entries', [JournalEntryController::class, 'index']);
Route::post('accounting/journal-entries', [JournalEntryController::class, 'batchStore']);
```

---

## 6. HR — Employees

### 6.1 Migration

```php
Schema::create('employee_profiles', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('employee_id')->nullable();
    $table->string('job_title')->nullable();
    $table->string('department')->nullable();
    $table->string('employment_type')->nullable(); // full-time, part-time, contract
    $table->date('hire_date')->nullable();
    $table->date('termination_date')->nullable();
    $table->decimal('salary', 15, 2)->nullable();
    $table->string('salary_currency', 3)->default('USD');
    $table->string('pay_period')->nullable(); // monthly, bi-weekly, weekly
    $table->string('bank_account')->nullable();
    $table->string('tax_id')->nullable();
    $table->text('address')->nullable();
    $table->string('emergency_contact_name')->nullable();
    $table->string('emergency_contact_phone')->nullable();
    $table->timestamps();

    $table->unique(['workspace_id', 'user_id']);
    $table->index(['workspace_id', 'department']);
});
```

### 6.2 Model

```php
// app/Models/EmployeeProfile.php
class EmployeeProfile extends Model
{
    protected $fillable = [
        'workspace_id', 'user_id', 'employee_id', 'job_title', 'department',
        'employment_type', 'hire_date', 'termination_date', 'salary', 'salary_currency',
        'pay_period', 'bank_account', 'tax_id', 'address',
        'emergency_contact_name', 'emergency_contact_phone',
    ];

    protected $casts = [
        'hire_date'        => 'date',
        'termination_date' => 'date',
        'salary'           => 'decimal:2',
    ];

    public function workspace(): BelongsTo { return $this->belongsTo(Workspace::class); }
    public function user(): BelongsTo      { return $this->belongsTo(User::class); }

    public function scopeForWorkspace(Builder $q, int $id): Builder { return $q->where('workspace_id', $id); }
    public function scopeActive(Builder $q): Builder { return $q->whereNull('termination_date'); }
}
```

### 6.3 Controller

```php
// app/Http/Controllers/Api/Hr/EmployeeController.php
class EmployeeController extends Controller
{
    /** GET /workspaces/{workspace}/employees */
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('viewAny', [EmployeeProfile::class, $workspace]);

        $employees = EmployeeProfile::forWorkspace($workspace->id)
            ->with('user:id,name,email,avatar')
            ->when($request->department, fn ($q, $d) => $q->where('department', $d))
            ->when($request->search, fn ($q, $s) => $q->whereHas('user', fn ($uq) =>
                $uq->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")))
            ->paginate($request->integer('per_page', 25));

        return response()->json($employees);
    }

    /** GET /workspaces/{workspace}/employees/{employee} */
    public function show(Workspace $workspace, EmployeeProfile $employee): JsonResponse
    {
        $this->authorize('view', $employee);
        return response()->json($employee->load('user'));
    }

    /** PUT /workspaces/{workspace}/employees/{employee} */
    public function update(UpdateEmployeeRequest $request, Workspace $workspace, EmployeeProfile $employee): JsonResponse
    {
        $this->authorize('update', $employee);
        $employee->update($request->validated());
        return response()->json($employee->fresh('user'));
    }
}
```

---

## 7. HR — Attendance

### 7.1 Migration

```php
Schema::create('attendance_records', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->date('work_date');
    $table->timestamp('clock_in_at')->nullable();
    $table->timestamp('clock_out_at')->nullable();
    $table->decimal('hours_worked', 5, 2)->nullable();
    $table->string('status')->default('present'); // present, absent, late, half-day
    $table->text('notes')->nullable();
    $table->string('ip_address', 45)->nullable();
    $table->timestamps();

    $table->unique(['workspace_id', 'user_id', 'work_date']);
    $table->index(['workspace_id', 'work_date']);
    $table->index(['workspace_id', 'user_id']);
});
```

### 7.2 Model

```php
// app/Models/AttendanceRecord.php
class AttendanceRecord extends Model
{
    protected $fillable = [
        'workspace_id', 'user_id', 'work_date', 'clock_in_at', 'clock_out_at',
        'hours_worked', 'status', 'notes', 'ip_address',
    ];

    protected $casts = [
        'work_date'    => 'date',
        'clock_in_at'  => 'datetime',
        'clock_out_at' => 'datetime',
        'hours_worked' => 'decimal:2',
    ];

    public function workspace(): BelongsTo { return $this->belongsTo(Workspace::class); }
    public function user(): BelongsTo      { return $this->belongsTo(User::class); }
}
```

### 7.3 Controller

```php
// app/Http/Controllers/Api/Hr/AttendanceController.php
class AttendanceController extends Controller
{
    /** GET /workspaces/{workspace}/attendance */
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('viewAny', [AttendanceRecord::class, $workspace]);

        $records = AttendanceRecord::where('workspace_id', $workspace->id)
            ->with('user:id,name,email')
            ->when($request->user_id, fn ($q, $uid) => $q->where('user_id', $uid))
            ->when($request->date_from, fn ($q, $d) => $q->where('work_date', '>=', $d))
            ->when($request->date_to,   fn ($q, $d) => $q->where('work_date', '<=', $d))
            ->orderByDesc('work_date')
            ->paginate($request->integer('per_page', 50));

        return response()->json($records);
    }

    /** POST /workspaces/{workspace}/attendance/clock-in */
    public function clockIn(Request $request, Workspace $workspace): JsonResponse
    {
        $today = now()->toDateString();

        $existing = AttendanceRecord::where([
            'workspace_id' => $workspace->id,
            'user_id'      => auth()->id(),
            'work_date'    => $today,
        ])->first();

        abort_if($existing && $existing->clock_in_at, 422, 'Already clocked in today.');

        $record = AttendanceRecord::updateOrCreate(
            ['workspace_id' => $workspace->id, 'user_id' => auth()->id(), 'work_date' => $today],
            ['clock_in_at' => now(), 'status' => 'present', 'ip_address' => $request->ip()]
        );

        return response()->json($record, 201);
    }

    /** POST /workspaces/{workspace}/attendance/clock-out */
    public function clockOut(Request $request, Workspace $workspace): JsonResponse
    {
        $record = AttendanceRecord::where([
            'workspace_id' => $workspace->id,
            'user_id'      => auth()->id(),
            'work_date'    => now()->toDateString(),
        ])->whereNotNull('clock_in_at')->firstOrFail();

        abort_if($record->clock_out_at, 422, 'Already clocked out today.');

        $hoursWorked = $record->clock_in_at->floatDiffInHours(now());
        $record->update(['clock_out_at' => now(), 'hours_worked' => round($hoursWorked, 2)]);

        return response()->json($record);
    }
}
```

### 7.4 Routes

```php
Route::get('attendance',              [AttendanceController::class, 'index']);
Route::post('attendance/clock-in',    [AttendanceController::class, 'clockIn']);
Route::post('attendance/clock-out',   [AttendanceController::class, 'clockOut']);
```

---

## 8. HR — Leave

### 8.1 Migration

```php
Schema::create('leave_types', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->integer('days_per_year')->default(0);
    $table->boolean('is_paid')->default(true);
    $table->boolean('carry_forward')->default(false);
    $table->timestamps();
});

Schema::create('leave_requests', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('leave_type_id')->constrained()->restrictOnDelete();
    $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
    $table->date('start_date');
    $table->date('end_date');
    $table->decimal('days_requested', 5, 1);
    $table->enum('status', ['pending', 'approved', 'declined', 'cancelled'])->default('pending');
    $table->text('reason')->nullable();
    $table->text('admin_notes')->nullable();
    $table->timestamp('actioned_at')->nullable();
    $table->timestamps();

    $table->index(['workspace_id', 'user_id', 'status']);
    $table->index(['workspace_id', 'start_date']);
});
```

### 8.2 Model

```php
// app/Models/LeaveRequest.php
class LeaveRequest extends Model
{
    protected $fillable = [
        'workspace_id', 'user_id', 'leave_type_id', 'approved_by',
        'start_date', 'end_date', 'days_requested', 'status', 'reason', 'admin_notes', 'actioned_at',
    ];

    protected $casts = [
        'start_date'  => 'date',
        'end_date'    => 'date',
        'actioned_at' => 'datetime',
    ];

    public function workspace(): BelongsTo  { return $this->belongsTo(Workspace::class); }
    public function user(): BelongsTo       { return $this->belongsTo(User::class); }
    public function leaveType(): BelongsTo  { return $this->belongsTo(LeaveType::class); }
    public function approver(): BelongsTo   { return $this->belongsTo(User::class, 'approved_by'); }
}
```

### 8.3 Controller

```php
// app/Http/Controllers/Api/Hr/LeaveController.php
class LeaveController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $q = LeaveRequest::where('workspace_id', $workspace->id)->with(['user', 'leaveType', 'approver']);

        // Non-admins only see their own
        if (! $request->user()->hasWorkspaceRole($workspace, ['admin', 'hr'])) {
            $q->where('user_id', auth()->id());
        }

        return response()->json($q->orderByDesc('start_date')->paginate(25));
    }

    public function store(StoreLeaveRequest $request, Workspace $workspace): JsonResponse
    {
        $leave = LeaveRequest::create([
            ...$request->validated(),
            'workspace_id' => $workspace->id,
            'user_id'      => auth()->id(),
            'status'       => 'pending',
        ]);
        return response()->json($leave->load('leaveType'), 201);
    }

    public function show(Workspace $workspace, LeaveRequest $leave): JsonResponse
    {
        $this->authorize('view', $leave);
        return response()->json($leave->load('user', 'leaveType', 'approver'));
    }

    public function update(Request $request, Workspace $workspace, LeaveRequest $leave): JsonResponse
    {
        $this->authorize('update', $leave);
        $leave->update($request->only('reason', 'start_date', 'end_date', 'days_requested'));
        return response()->json($leave->fresh());
    }

    public function destroy(Workspace $workspace, LeaveRequest $leave): Response
    {
        $this->authorize('delete', $leave);
        abort_unless($leave->status === 'pending', 422, 'Only pending requests can be cancelled.');
        $leave->update(['status' => 'cancelled']);
        return response()->noContent();
    }

    /** PATCH /workspaces/{workspace}/leave/{leave} — approve or decline */
    public function action(Request $request, Workspace $workspace, LeaveRequest $leave): JsonResponse
    {
        $this->authorize('action', $leave);
        $request->validate(['action' => ['required', 'in:approve,decline'], 'admin_notes' => ['nullable', 'string']]);

        $leave->update([
            'status'      => $request->action === 'approve' ? 'approved' : 'declined',
            'approved_by' => auth()->id(),
            'admin_notes' => $request->admin_notes,
            'actioned_at' => now(),
        ]);

        return response()->json($leave->fresh('approver'));
    }

    /** GET /workspaces/{workspace}/leave/balance */
    public function balance(Request $request, Workspace $workspace): JsonResponse
    {
        $userId = $request->integer('user_id', auth()->id());
        $year   = $request->integer('year', now()->year);

        $balances = LeaveType::where('workspace_id', $workspace->id)->get()->map(function ($type) use ($userId, $workspace, $year) {
            $used = LeaveRequest::where([
                'workspace_id'  => $workspace->id,
                'user_id'       => $userId,
                'leave_type_id' => $type->id,
                'status'        => 'approved',
            ])->whereYear('start_date', $year)->sum('days_requested');

            return [
                'leave_type'  => $type,
                'entitled'    => $type->days_per_year,
                'used'        => $used,
                'remaining'   => max(0, $type->days_per_year - $used),
            ];
        });

        return response()->json($balances);
    }
}
```

### 8.4 Routes

```php
Route::get('leave/balance',         [LeaveController::class, 'balance']);
Route::get('leave',                 [LeaveController::class, 'index']);
Route::post('leave',                [LeaveController::class, 'store']);
Route::get('leave/{leave}',         [LeaveController::class, 'show']);
Route::put('leave/{leave}',         [LeaveController::class, 'update']);
Route::delete('leave/{leave}',      [LeaveController::class, 'destroy']);
Route::patch('leave/{leave}/action',[LeaveController::class, 'action']);
```

---

## 9. HR — Expenses

### 9.1 Migration

```php
Schema::create('expense_claims', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
    $table->string('title');
    $table->text('description')->nullable();
    $table->decimal('amount', 15, 2);
    $table->string('currency', 3)->default('USD');
    $table->string('category')->nullable(); // travel, meals, equipment, etc.
    $table->date('expense_date');
    $table->string('receipt_path')->nullable();
    $table->enum('status', ['pending', 'approved', 'declined', 'reimbursed'])->default('pending');
    $table->text('admin_notes')->nullable();
    $table->timestamp('actioned_at')->nullable();
    $table->timestamp('reimbursed_at')->nullable();
    $table->timestamps();

    $table->index(['workspace_id', 'user_id', 'status']);
    $table->index(['workspace_id', 'expense_date']);
});
```

### 9.2 Model

```php
// app/Models/ExpenseClaim.php
class ExpenseClaim extends Model
{
    protected $fillable = [
        'workspace_id', 'user_id', 'approved_by', 'title', 'description',
        'amount', 'currency', 'category', 'expense_date', 'receipt_path',
        'status', 'admin_notes', 'actioned_at', 'reimbursed_at',
    ];

    protected $casts = [
        'expense_date'  => 'date',
        'actioned_at'   => 'datetime',
        'reimbursed_at' => 'datetime',
        'amount'        => 'decimal:2',
    ];

    public function workspace(): BelongsTo { return $this->belongsTo(Workspace::class); }
    public function user(): BelongsTo      { return $this->belongsTo(User::class); }
    public function approver(): BelongsTo  { return $this->belongsTo(User::class, 'approved_by'); }
}
```

### 9.3 Controller

```php
// app/Http/Controllers/Api/Hr/ExpenseController.php
class ExpenseController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $q = ExpenseClaim::where('workspace_id', $workspace->id)->with(['user', 'approver']);

        if (! $request->user()->hasWorkspaceRole($workspace, ['admin', 'hr'])) {
            $q->where('user_id', auth()->id());
        }

        return response()->json($q->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('expense_date')->paginate(25));
    }

    public function store(StoreExpenseClaimRequest $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('receipt')) {
            $data['receipt_path'] = $request->file('receipt')->store("workspaces/{$workspace->id}/receipts", 's3');
        }

        $expense = ExpenseClaim::create([...$data, 'workspace_id' => $workspace->id, 'user_id' => auth()->id()]);
        return response()->json($expense, 201);
    }

    /** PATCH /workspaces/{workspace}/expenses/{expense} — approve/decline/reimburse */
    public function action(Request $request, Workspace $workspace, ExpenseClaim $expense): JsonResponse
    {
        $this->authorize('action', $expense);
        $request->validate(['action' => ['required', 'in:approve,decline,reimburse'], 'admin_notes' => ['nullable', 'string']]);

        $updates = ['admin_notes' => $request->admin_notes, 'approved_by' => auth()->id(), 'actioned_at' => now()];

        match ($request->action) {
            'approve'    => $updates['status'] = 'approved',
            'decline'    => $updates['status'] = 'declined',
            'reimburse'  => $updates = [...$updates, 'status' => 'reimbursed', 'reimbursed_at' => now()],
        };

        $expense->update($updates);
        return response()->json($expense->fresh('approver'));
    }
}
```

### 9.4 Routes

```php
Route::get('expenses',               [ExpenseController::class, 'index']);
Route::post('expenses',              [ExpenseController::class, 'store']);
Route::get('expenses/{expense}',     [ExpenseController::class, 'show']);
Route::patch('expenses/{expense}',   [ExpenseController::class, 'action']);
```

---

## 10. Meetings

### 10.1 Migration

```php
Schema::create('meetings', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
    $table->string('title');
    $table->text('description')->nullable();
    $table->string('location')->nullable();
    $table->string('meeting_link')->nullable();
    $table->timestamp('starts_at');
    $table->timestamp('ends_at');
    $table->enum('status', ['scheduled', 'ongoing', 'completed', 'cancelled'])->default('scheduled');
    $table->text('agenda')->nullable();
    $table->text('minutes')->nullable();
    $table->timestamps();

    $table->index(['workspace_id', 'starts_at']);
    $table->index(['workspace_id', 'status']);
});

Schema::create('meeting_attendees', function (Blueprint $table) {
    $table->id();
    $table->foreignId('meeting_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->enum('rsvp', ['pending', 'accepted', 'declined', 'tentative'])->default('pending');
    $table->boolean('attended')->nullable();
    $table->timestamps();

    $table->unique(['meeting_id', 'user_id']);
    $table->index('meeting_id');
});
```

### 10.2 Models

```php
// app/Models/Meeting.php
class Meeting extends Model
{
    protected $fillable = [
        'workspace_id', 'created_by', 'title', 'description', 'location',
        'meeting_link', 'starts_at', 'ends_at', 'status', 'agenda', 'minutes',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at'   => 'datetime',
    ];

    public function workspace(): BelongsTo     { return $this->belongsTo(Workspace::class); }
    public function creator(): BelongsTo       { return $this->belongsTo(User::class, 'created_by'); }
    public function attendees(): HasMany        { return $this->hasMany(MeetingAttendee::class); }
    public function attendeeUsers(): BelongsToMany {
        return $this->belongsToMany(User::class, 'meeting_attendees')
            ->withPivot('rsvp', 'attended')->withTimestamps();
    }

    public function scopeForWorkspace(Builder $q, int $id): Builder { return $q->where('workspace_id', $id); }
    public function scopeUpcoming(Builder $q): Builder { return $q->where('starts_at', '>', now())->where('status', 'scheduled'); }
}
```

### 10.3 Controller

```php
// app/Http/Controllers/Api/MeetingController.php
class MeetingController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        return response()->json(
            Meeting::forWorkspace($workspace->id)
                ->with(['creator:id,name', 'attendees.user:id,name,email'])
                ->when($request->status, fn ($q, $s) => $q->where('status', $s))
                ->when($request->from,   fn ($q, $d) => $q->where('starts_at', '>=', $d))
                ->when($request->to,     fn ($q, $d) => $q->where('ends_at', '<=', $d))
                ->orderBy('starts_at')
                ->paginate(25)
        );
    }

    public function store(StoreMeetingRequest $request, Workspace $workspace): JsonResponse
    {
        $meeting = DB::transaction(function () use ($request, $workspace) {
            $meeting = Meeting::create([...$request->validated(), 'workspace_id' => $workspace->id, 'created_by' => auth()->id()]);
            if ($request->has('attendee_ids')) {
                foreach ($request->attendee_ids as $userId) {
                    $meeting->attendees()->create(['user_id' => $userId]);
                }
            }
            return $meeting->load('attendees.user');
        });
        return response()->json($meeting, 201);
    }

    public function show(Workspace $workspace, Meeting $meeting): JsonResponse
    {
        return response()->json($meeting->load('creator', 'attendees.user'));
    }

    public function update(UpdateMeetingRequest $request, Workspace $workspace, Meeting $meeting): JsonResponse
    {
        $this->authorize('update', $meeting);
        $meeting->update($request->validated());
        return response()->json($meeting->fresh('attendees.user'));
    }

    public function destroy(Workspace $workspace, Meeting $meeting): Response
    {
        $this->authorize('delete', $meeting);
        $meeting->delete();
        return response()->noContent();
    }

    /** PATCH /workspaces/{workspace}/meetings/{meeting}/attendance */
    public function attendance(Request $request, Workspace $workspace, Meeting $meeting): JsonResponse
    {
        $this->authorize('update', $meeting);
        $request->validate([
            'attendees'           => ['required', 'array'],
            'attendees.*.user_id' => ['required', 'integer', 'exists:users,id'],
            'attendees.*.attended'=> ['required', 'boolean'],
        ]);

        foreach ($request->attendees as $att) {
            $meeting->attendees()->where('user_id', $att['user_id'])->update(['attended' => $att['attended']]);
        }

        return response()->json($meeting->load('attendees.user'));
    }
}
```

### 10.4 Routes

```php
Route::apiResource('meetings', MeetingController::class);
Route::patch('meetings/{meeting}/attendance', [MeetingController::class, 'attendance']);
```

---

## 11. Reports

### 11.1 Controller

```php
// app/Http/Controllers/Api/ReportController.php
namespace App\Http\Controllers\Api;

use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /** GET /workspaces/{workspace}/reports/dashboard */
    public function dashboard(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('viewReports', $workspace);

        return response()->json([
            'revenue_this_month'   => Invoice::forWorkspace($workspace->id)->where('status', 'paid')
                ->whereMonth('paid_at', now()->month)->sum('total'),
            'pending_invoices'     => Invoice::forWorkspace($workspace->id)->where('status', 'sent')->count(),
            'overdue_invoices'     => Invoice::forWorkspace($workspace->id)->overdue()->count(),
            'open_purchase_orders' => PurchaseOrder::forWorkspace($workspace->id)->whereNotIn('status', ['received', 'cancelled'])->count(),
            'pending_expenses'     => ExpenseClaim::where('workspace_id', $workspace->id)->where('status', 'pending')->count(),
            'employees_on_leave'   => LeaveRequest::where('workspace_id', $workspace->id)->where('status', 'approved')
                ->where('start_date', '<=', today())->where('end_date', '>=', today())->count(),
        ]);
    }

    /** GET /workspaces/{workspace}/reports/expenses */
    public function expenses(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('viewReports', $workspace);

        $data = ExpenseClaim::where('workspace_id', $workspace->id)
            ->when($request->from,     fn ($q, $d) => $q->where('expense_date', '>=', $d))
            ->when($request->to,       fn ($q, $d) => $q->where('expense_date', '<=', $d))
            ->when($request->status,   fn ($q, $s) => $q->where('status', $s))
            ->when($request->category, fn ($q, $c) => $q->where('category', $c))
            ->selectRaw('category, status, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('category', 'status')
            ->get();

        return response()->json($data);
    }

    /** GET /workspaces/{workspace}/reports/procurement */
    public function procurement(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('viewReports', $workspace);

        return response()->json([
            'purchase_orders_by_status' => PurchaseOrder::forWorkspace($workspace->id)
                ->selectRaw('status, COUNT(*) as count, SUM(total) as total')
                ->groupBy('status')->get(),
            'top_suppliers' => PurchaseOrder::forWorkspace($workspace->id)
                ->selectRaw('supplier_name, COUNT(*) as count, SUM(total) as total')
                ->groupBy('supplier_name')->orderByDesc('total')->limit(10)->get(),
        ]);
    }

    /** GET /workspaces/{workspace}/reports/inventory */
    public function inventory(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('viewReports', $workspace);

        return response()->json([
            'total_products'  => Product::forWorkspace($workspace->id)->active()->count(),
            'low_stock'       => Product::forWorkspace($workspace->id)->lowStock()->with('category')->get(),
            'by_category'     => Product::forWorkspace($workspace->id)
                ->selectRaw('category_id, COUNT(*) as count')
                ->groupBy('category_id')->with('category:id,name')->get(),
        ]);
    }

    /** GET /workspaces/{workspace}/reports/export/{type} */
    public function export(Request $request, Workspace $workspace, string $type): StreamedResponse|JsonResponse
    {
        $this->authorize('viewReports', $workspace);

        abort_unless(in_array($type, ['invoices', 'expenses', 'purchase-orders', 'attendance']), 404);

        $filename = "{$workspace->slug}-{$type}-" . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($type, $workspace, $request) {
            $handle = fopen('php://output', 'w');

            match ($type) {
                'invoices'        => $this->exportInvoicesCsv($handle, $workspace, $request),
                'expenses'        => $this->exportExpensesCsv($handle, $workspace, $request),
                'purchase-orders' => $this->exportPurchaseOrdersCsv($handle, $workspace, $request),
                'attendance'      => $this->exportAttendanceCsv($handle, $workspace, $request),
            };

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function exportInvoicesCsv($handle, Workspace $workspace, Request $request): void
    {
        fputcsv($handle, ['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Status', 'Total', 'Currency']);
        Invoice::forWorkspace($workspace->id)->cursor()->each(function ($inv) use ($handle) {
            fputcsv($handle, [$inv->invoice_number, $inv->client_name, $inv->issue_date, $inv->due_date, $inv->status, $inv->total, $inv->currency]);
        });
    }

    // Similar private methods for other export types...
}
```

### 11.2 Routes

```php
Route::prefix('reports')->group(function () {
    Route::get('dashboard',           [ReportController::class, 'dashboard']);
    Route::get('expenses',            [ReportController::class, 'expenses']);
    Route::get('procurement',         [ReportController::class, 'procurement']);
    Route::get('inventory',           [ReportController::class, 'inventory']);
    Route::get('export/{type}',       [ReportController::class, 'export']);
});
```

---

## 12. Automations — Templates

### 12.1 Migration

```php
Schema::create('automation_templates', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('slug')->unique();
    $table->text('description')->nullable();
    $table->string('category'); // hr, erp, communication, etc.
    $table->string('trigger_event');
    $table->json('actions');
    $table->json('default_config')->nullable();
    $table->boolean('is_active')->default(true);
    $table->integer('usage_count')->default(0);
    $table->timestamps();

    $table->index(['category', 'is_active']);
});
```

### 12.2 Model

```php
// app/Models/AutomationTemplate.php
class AutomationTemplate extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'category', 'trigger_event', 'actions', 'default_config', 'is_active', 'usage_count'];

    protected $casts = [
        'actions'        => 'array',
        'default_config' => 'array',
        'is_active'      => 'boolean',
    ];

    public function scopeActive(Builder $q): Builder    { return $q->where('is_active', true); }
    public function scopeCategory(Builder $q, string $c): Builder { return $q->where('category', $c); }
}
```

### 12.3 Controller

```php
// app/Http/Controllers/Api/AutomationTemplateController.php
class AutomationTemplateController extends Controller
{
    /** GET /automation-templates — global, no workspace scope, public to all authed users */
    public function index(Request $request): JsonResponse
    {
        $templates = AutomationTemplate::active()
            ->when($request->category, fn ($q, $c) => $q->category($c))
            ->when($request->search,   fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderByDesc('usage_count')
            ->get();

        return response()->json($templates);
    }

    public function show(AutomationTemplate $template): JsonResponse
    {
        return response()->json($template);
    }
}
```

### 12.4 Routes

```php
// Note: outside workspace prefix, global scope
Route::get('automation-templates',        [AutomationTemplateController::class, 'index']);
Route::get('automation-templates/{template}', [AutomationTemplateController::class, 'show']);
```

---

## 13. Settings — Missing Routes

### 13.1 Workspace Logo

```php
// app/Http/Controllers/Api/WorkspaceLogoController.php
class WorkspaceLogoController extends Controller
{
    /** POST /workspaces/{workspace}/logo */
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('update', $workspace);
        $request->validate(['logo' => ['required', 'image', 'mimes:jpg,jpeg,png,gif,svg,webp', 'max:2048']]);

        if ($workspace->logo_path) {
            Storage::disk('s3')->delete($workspace->logo_path);
        }

        $path = $request->file('logo')->store("workspaces/{$workspace->id}/logos", 's3');
        $workspace->update(['logo_path' => $path, 'logo_url' => Storage::disk('s3')->url($path)]);

        return response()->json(['logo_url' => $workspace->logo_url]);
    }

    /** DELETE /workspaces/{workspace}/logo */
    public function destroy(Workspace $workspace): Response
    {
        $this->authorize('update', $workspace);

        if ($workspace->logo_path) {
            Storage::disk('s3')->delete($workspace->logo_path);
            $workspace->update(['logo_path' => null, 'logo_url' => null]);
        }

        return response()->noContent();
    }
}
```

### 13.2 Audit Logs

```php
// Migration — if not already present via a package
Schema::create('audit_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->nullable()->constrained()->nullOnDelete();
    $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
    $table->string('event');          // created, updated, deleted, login, etc.
    $table->string('auditable_type')->nullable();
    $table->unsignedBigInteger('auditable_id')->nullable();
    $table->json('old_values')->nullable();
    $table->json('new_values')->nullable();
    $table->string('ip_address', 45)->nullable();
    $table->string('user_agent')->nullable();
    $table->timestamps();

    $table->index(['workspace_id', 'created_at']);
    $table->index(['auditable_type', 'auditable_id']);
    $table->index(['user_id', 'event']);
});

// app/Http/Controllers/Api/AuditLogController.php
class AuditLogController extends Controller
{
    /** GET /workspaces/{workspace}/audit-logs */
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('viewAuditLogs', $workspace);

        $logs = AuditLog::where('workspace_id', $workspace->id)
            ->with('user:id,name,email')
            ->when($request->event,   fn ($q, $e) => $q->where('event', $e))
            ->when($request->user_id, fn ($q, $u) => $q->where('user_id', $u))
            ->when($request->from,    fn ($q, $d) => $q->where('created_at', '>=', $d))
            ->when($request->to,      fn ($q, $d) => $q->where('created_at', '<=', $d))
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 50));

        return response()->json($logs);
    }
}
```

### 13.3 User Sessions

```php
// app/Http/Controllers/Api/UserSessionController.php
class UserSessionController extends Controller
{
    /** GET /user/sessions */
    public function index(): JsonResponse
    {
        $sessions = DB::table('sessions')
            ->where('user_id', auth()->id())
            ->orderByDesc('last_activity')
            ->get()
            ->map(fn ($s) => [
                'id'            => $s->id,
                'ip_address'    => $s->ip_address,
                'user_agent'    => $s->user_agent,
                'last_activity' => \Carbon\Carbon::createFromTimestamp($s->last_activity)->toDateTimeString(),
                'is_current'    => $s->id === request()->session()->getId(),
            ]);

        return response()->json($sessions);
    }

    /** DELETE /user/sessions/{id} */
    public function destroy(string $id): Response
    {
        $deleted = DB::table('sessions')
            ->where('user_id', auth()->id())
            ->where('id', $id)
            ->delete();

        abort_unless($deleted, 404, 'Session not found.');
        return response()->noContent();
    }
}
```

### 13.4 Notification Preferences

```php
// Migration
Schema::create('user_notification_preferences', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('channel');      // email, in-app, push
    $table->string('event_type');   // invoice.paid, leave.approved, expense.declined, etc.
    $table->boolean('enabled')->default(true);
    $table->timestamps();

    $table->unique(['user_id', 'channel', 'event_type']);
});

// app/Http/Controllers/Api/NotificationPreferenceController.php
class NotificationPreferenceController extends Controller
{
    /** GET /user/notifications/preferences */
    public function index(): JsonResponse
    {
        $prefs = UserNotificationPreference::where('user_id', auth()->id())->get();
        return response()->json($prefs);
    }

    /** PUT /user/notifications/preferences */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'preferences'              => ['required', 'array'],
            'preferences.*.channel'    => ['required', 'in:email,in-app,push'],
            'preferences.*.event_type' => ['required', 'string', 'max:100'],
            'preferences.*.enabled'    => ['required', 'boolean'],
        ]);

        foreach ($request->preferences as $pref) {
            UserNotificationPreference::updateOrCreate(
                ['user_id' => auth()->id(), 'channel' => $pref['channel'], 'event_type' => $pref['event_type']],
                ['enabled' => $pref['enabled']]
            );
        }

        return response()->json(UserNotificationPreference::where('user_id', auth()->id())->get());
    }
}
```

### 13.5 Change Password

```php
// app/Http/Controllers/Api/ChangePasswordController.php
class ChangePasswordController extends Controller
{
    /** POST /user/password */
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password'         => ['required', 'string', 'min:8', 'confirmed', Password::defaults()],
        ]);

        auth()->user()->update(['password' => bcrypt($request->password)]);

        // Revoke all other tokens so they must re-login
        auth()->user()->tokens()->where('id', '!=', auth()->user()->currentAccessToken()->id)->delete();

        return response()->json(['message' => 'Password updated successfully.']);
    }
}
```

### 13.6 Routes

```php
// Workspace-scoped
Route::post('logo',            [WorkspaceLogoController::class, 'store']);
Route::delete('logo',          [WorkspaceLogoController::class, 'destroy']);
Route::get('audit-logs',       [AuditLogController::class, 'index']);

// User-scoped (outside workspace prefix)
Route::prefix('user')->group(function () {
    Route::get('sessions',                      [UserSessionController::class, 'index']);
    Route::delete('sessions/{id}',              [UserSessionController::class, 'destroy']);
    Route::get('notifications/preferences',     [NotificationPreferenceController::class, 'index']);
    Route::put('notifications/preferences',     [NotificationPreferenceController::class, 'update']);
    Route::post('password',                     ChangePasswordController::class);
});
```

---

## 14. Auth — Missing Routes

### 14.1 Email Verification

Laravel Fortify/Jetstream already ships email verification, but if using a custom SPA flow:

```php
// app/Http/Controllers/Auth/EmailVerificationController.php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;

class EmailVerificationController extends Controller
{
    /** GET /email/verify/{id}/{hash} — verification link from email */
    public function verify(EmailVerificationRequest $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect(config('app.frontend_url') . '/dashboard?verified=already');
        }

        $request->fulfill();

        return redirect(config('app.frontend_url') . '/dashboard?verified=1');
    }

    /** POST /email/verification-notification — resend */
    public function resend(Request $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.'], 200);
        }

        $request->user()->sendEmailVerificationNotification();
        return response()->json(['message' => 'Verification link resent.']);
    }
}
```

### 14.2 OAuth Callback

```php
// app/Http/Controllers/Auth/OAuthController.php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;

class OAuthController extends Controller
{
    /** GET /auth/redirect/{provider} */
    public function redirect(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, ['google', 'github', 'microsoft']), 404);
        return Socialite::driver($provider)->stateless()->redirect();
    }

    /** GET /auth/callback/{provider} */
    public function callback(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, ['google', 'github', 'microsoft']), 404);

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Exception $e) {
            return redirect(config('app.frontend_url') . '/login?error=oauth_failed');
        }

        $user = User::firstOrCreate(
            ['email' => $socialUser->getEmail()],
            [
                'name'              => $socialUser->getName(),
                'password'          => bcrypt(\Str::random(32)),
                'email_verified_at' => now(),
            ]
        );

        // Upsert social account
        $user->socialAccounts()->updateOrCreate(
            ['provider' => $provider, 'provider_id' => $socialUser->getId()],
            ['token' => $socialUser->token, 'avatar' => $socialUser->getAvatar()]
        );

        $token = $user->createToken('oauth-token')->plainTextToken;

        return redirect(config('app.frontend_url') . "/auth/callback?token={$token}");
    }
}
```

### 14.3 Routes

```php
// In routes/web.php (for email verification — must be web middleware for session)
Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware(['auth', 'signed'])->name('verification.verify');
Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
    ->middleware(['auth', 'throttle:6,1'])->name('verification.send');

// In routes/api.php or routes/web.php
Route::get('auth/redirect/{provider}', [OAuthController::class, 'redirect']);
Route::get('auth/callback/{provider}', [OAuthController::class, 'callback']);
```

---

## Appendix A — Full api.php Route Structure

```php
// routes/api.php

use Illuminate\Support\Facades\Route;

// Global routes (no workspace scope)
Route::middleware('auth:sanctum')->group(function () {
    // Automation Templates
    Route::get('automation-templates',             [AutomationTemplateController::class, 'index']);
    Route::get('automation-templates/{template}',  [AutomationTemplateController::class, 'show']);

    // User settings
    Route::prefix('user')->group(function () {
        Route::get('sessions',                     [UserSessionController::class, 'index']);
        Route::delete('sessions/{id}',             [UserSessionController::class, 'destroy']);
        Route::get('notifications/preferences',    [NotificationPreferenceController::class, 'index']);
        Route::put('notifications/preferences',    [NotificationPreferenceController::class, 'update']);
        Route::post('password',                    ChangePasswordController::class);
    });

    // Workspace-scoped routes
    Route::prefix('workspaces/{workspace}')->group(function () {

        // ERP — Invoicing
        Route::prefix('invoices')->group(function () {
            Route::get('/',                        [InvoiceController::class, 'index']);
            Route::post('/',                       [InvoiceController::class, 'store']);
            Route::get('/{invoice}',               [InvoiceController::class, 'show']);
            Route::patch('/{invoice}',             [InvoiceController::class, 'update']);
            Route::delete('/{invoice}',            [InvoiceController::class, 'destroy']);
            Route::get('/{invoice}/pdf',           [InvoiceController::class, 'pdf']);
            Route::post('/{invoice}/send',         [InvoiceController::class, 'send']);
            Route::post('/{invoice}/mark-paid',    [InvoiceController::class, 'markPaid']);
        });
        Route::post('sales/orders/{order}/convert-to-invoice', SalesOrderConversionController::class);

        // ERP — Purchase & Sales Orders
        Route::apiResource('purchases/orders', PurchaseOrderController::class)->parameters(['orders' => 'order']);
        Route::apiResource('sales/orders',     SalesOrderController::class)->parameters(['orders' => 'order']);

        // ERP — Inventory
        Route::apiResource('inventory/categories', InventoryCategoryController::class);
        Route::apiResource('inventory/products',   ProductController::class);
        Route::apiResource('inventory/stock-items', StockItemController::class);
        Route::get('inventory/products/{product}/stock-items', [StockItemController::class, 'forProduct']);

        // ERP — Accounting
        Route::apiResource('accounting/accounts', AccountController::class);
        Route::get('accounting/journal-entries',  [JournalEntryController::class, 'index']);
        Route::post('accounting/journal-entries', [JournalEntryController::class, 'batchStore']);

        // HR
        Route::get('employees',                   [EmployeeController::class, 'index']);
        Route::get('employees/{employee}',         [EmployeeController::class, 'show']);
        Route::put('employees/{employee}',         [EmployeeController::class, 'update']);

        Route::get('attendance',                   [AttendanceController::class, 'index']);
        Route::post('attendance/clock-in',         [AttendanceController::class, 'clockIn']);
        Route::post('attendance/clock-out',        [AttendanceController::class, 'clockOut']);

        Route::get('leave/balance',                [LeaveController::class, 'balance']);
        Route::apiResource('leave',                LeaveController::class);
        Route::patch('leave/{leave}/action',       [LeaveController::class, 'action']);

        Route::get('expenses',                     [ExpenseController::class, 'index']);
        Route::post('expenses',                    [ExpenseController::class, 'store']);
        Route::get('expenses/{expense}',           [ExpenseController::class, 'show']);
        Route::patch('expenses/{expense}',         [ExpenseController::class, 'action']);

        // Meetings
        Route::apiResource('meetings', MeetingController::class);
        Route::patch('meetings/{meeting}/attendance', [MeetingController::class, 'attendance']);

        // Reports
        Route::prefix('reports')->group(function () {
            Route::get('dashboard',                [ReportController::class, 'dashboard']);
            Route::get('expenses',                 [ReportController::class, 'expenses']);
            Route::get('procurement',              [ReportController::class, 'procurement']);
            Route::get('inventory',                [ReportController::class, 'inventory']);
            Route::get('export/{type}',            [ReportController::class, 'export']);
        });

        // Settings
        Route::post('logo',                        [WorkspaceLogoController::class, 'store']);
        Route::delete('logo',                      [WorkspaceLogoController::class, 'destroy']);
        Route::get('audit-logs',                   [AuditLogController::class, 'index']);
    });
});
```

---

## Appendix B — Policy Registration

Register all policies in `app/Providers/AuthServiceProvider.php`:

```php
protected $policies = [
    Invoice::class       => InvoicePolicy::class,
    SalesOrder::class    => SalesOrderPolicy::class,
    PurchaseOrder::class => PurchaseOrderPolicy::class,
    Product::class       => ProductPolicy::class,
    StockItem::class     => StockItemPolicy::class,
    Account::class       => AccountPolicy::class,
    JournalEntry::class  => JournalEntryPolicy::class,
    EmployeeProfile::class => EmployeePolicy::class,
    AttendanceRecord::class => AttendancePolicy::class,
    LeaveRequest::class  => LeavePolicy::class,
    ExpenseClaim::class  => ExpensePolicy::class,
    Meeting::class       => MeetingPolicy::class,
];
```

**Base policy pattern** (replicate for every model):

```php
// The pattern every policy follows:
public function viewAny(User $user, Workspace $workspace): bool
    => $user->belongsToWorkspace($workspace);

public function view(User $user, $model): bool
    => $user->belongsToWorkspace($model->workspace_id);

public function create(User $user, Workspace $workspace): bool
    => $user->hasWorkspaceRole($workspace, ['admin', '<relevant-role>']);

public function update(User $user, $model): bool
    => $user->hasWorkspaceRole($model->workspace, ['admin', '<relevant-role>']);

public function delete(User $user, $model): bool
    => $user->hasWorkspaceRole($model->workspace, ['admin']);
```

---

## Appendix C — Migration Execution Order

Run migrations in this order to satisfy foreign key constraints:

```
1.  inventory_categories
2.  products
3.  stock_items
4.  accounts
5.  journal_entries
6.  journal_entry_lines
7.  sales_orders
8.  sales_order_line_items
9.  purchase_orders
10. purchase_order_line_items
11. invoices (references sales_orders)
12. invoice_line_items
13. employee_profiles
14. leave_types
15. leave_requests
16. attendance_records
17. expense_claims
18. meetings
19. meeting_attendees
20. audit_logs
21. user_notification_preferences
22. automation_templates
```

---

## Appendix D — Environment Variables Required

```dotenv
# Gotenberg (PDF generation)
GOTENBERG_URL=http://gotenberg:3000

# OAuth providers (for Auth section)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/api/auth/callback/google"

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI="${APP_URL}/api/auth/callback/github"

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI="${APP_URL}/api/auth/callback/microsoft"

# Frontend URL (for OAuth redirects and email verification)
FRONTEND_URL=https://app.example.com
```

---

*End of backend gap implementation plan. Total modules: 14. Total tables: 22. Total controllers: 19.*
