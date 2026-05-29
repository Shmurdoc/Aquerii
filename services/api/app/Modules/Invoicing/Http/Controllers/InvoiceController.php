<?php

namespace App\Modules\Invoicing\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Invoicing\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = Invoice::where('workspace_id', $workspace->id)->with('items');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'ilike', "%{$this->escapeLike($search)}%")
                    ->orWhere('customer_name', 'ilike', "%{$this->escapeLike($search)}%");
            });
        }

        $invoices = $query->orderBy('created_at', 'desc')->paginate($request->query('per_page', 50));

        return response()->json($invoices);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number' => 'required|string|max:50',
            'currency' => 'sometimes|string|size:3',
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'billing_address' => 'nullable|string',
            'issue_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:issue_date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string|max:500',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'sometimes|numeric|min:0|max:100',
        ]);

        $subtotal = 0;
        $taxTotal = 0;
        $items = [];

        foreach ($validated['items'] as $item) {
            $lineTotal = $item['quantity'] * $item['unit_price'];
            $lineTax = $lineTotal * ($item['tax_rate'] ?? 0) / 100;
            $subtotal += $lineTotal;
            $taxTotal += $lineTax;
            $items[] = [
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'tax_rate' => $item['tax_rate'] ?? 0,
                'total' => $lineTotal + $lineTax,
            ];
        }

        $invoice = Invoice::create([
            'workspace_id' => $workspace->id,
            'invoice_number' => $validated['invoice_number'],
            'status' => 'draft',
            'currency' => $validated['currency'] ?? 'USD',
            'subtotal' => $subtotal,
            'tax_total' => $taxTotal,
            'total' => $subtotal + $taxTotal,
            'customer_name' => $validated['customer_name'],
            'customer_email' => $validated['customer_email'],
            'billing_address' => $validated['billing_address'] ?? null,
            'issue_date' => $validated['issue_date'],
            'due_date' => $validated['due_date'],
            'notes' => $validated['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        foreach ($items as $item) {
            $invoice->items()->create($item);
        }

        $invoice->load('items');

        return response()->json(['data' => $invoice], 201);
    }

    public function show(Workspace $workspace, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->workspace_id !== $workspace->id, 404);
        $invoice->load('items');

        return response()->json(['data' => $invoice]);
    }

    public function update(Request $request, Workspace $workspace, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'status' => 'sometimes|string|max:20',
            'invoice_number' => 'sometimes|string|max:50',
            'customer_name' => 'sometimes|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'billing_address' => 'nullable|string',
            'due_date' => 'sometimes|date',
            'notes' => 'nullable|string',
        ]);

        $invoice->update($validated);

        return response()->json(['data' => $invoice->fresh()->load('items')]);
    }

    public function destroy(Workspace $workspace, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->workspace_id !== $workspace->id, 404);
        $invoice->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
