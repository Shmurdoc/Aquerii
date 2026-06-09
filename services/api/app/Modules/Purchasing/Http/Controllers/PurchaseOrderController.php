<?php

namespace App\Modules\Purchasing\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Purchasing\Models\PurchaseOrder;
use App\Modules\Purchasing\Models\PurchaseOrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseOrderController extends Controller
{
    public function index(Workspace $workspace, Request $request): JsonResponse
    {
        $query = PurchaseOrder::with('items')
            ->where('workspace_id', $workspace->id);

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$this->escapeLike($search)}%")
                    ->orWhere('supplier_name', 'like', "%{$this->escapeLike($search)}%");
            });
        }

        $orders = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 50));

        return response()->json($orders);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $request->validate([
            'supplier_id' => 'nullable|string|max:255',
            'supplier_name' => 'required|string|max:255',
            'supplier_email' => 'nullable|email|max:255',
            'currency' => 'nullable|string|size:3',
            'order_date' => 'nullable|date',
            'expected_date' => 'nullable|date|after_or_equal:order_date',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.product_id' => 'nullable|string|max:255',
            'items.*.description' => 'required|string|max:500',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        return DB::transaction(function () use ($request, $workspace) {
            $items = $request->items ?? [];

            $subtotal = collect($items)->sum(fn ($i) => $i['quantity'] * $i['unit_price']);
            $taxTotal = collect($items)->sum(fn ($i) => ($i['quantity'] * $i['unit_price']) * ($i['tax_rate'] ?? 0) / 100);

            $order = PurchaseOrder::create([
                'workspace_id' => $workspace->id,
                'order_number' => 'PO-'.strtoupper(Str::random(8)),
                'supplier_id' => $request->supplier_id,
                'supplier_name' => $request->supplier_name,
                'supplier_email' => $request->supplier_email,
                'status' => 'draft',
                'currency' => $request->currency ?? 'ZAR',
                'subtotal' => $subtotal,
                'tax_total' => $taxTotal,
                'total' => $subtotal + $taxTotal,
                'order_date' => $request->order_date ?? now(),
                'expected_date' => $request->expected_date,
                'notes' => $request->notes,
                'created_by' => $request->user()->id,
            ]);

            foreach ($items as $item) {
                $itemTotal = $item['quantity'] * $item['unit_price'] * (1 + ($item['tax_rate'] ?? 0) / 100);
                PurchaseOrderItem::create([
                    'purchase_order_id' => $order->id,
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'tax_rate' => $item['tax_rate'] ?? 0,
                    'total' => $itemTotal,
                ]);
            }

            $order->load('items');

            return response()->json(['data' => $order], 201);
        });
    }

    public function show(Workspace $workspace, string $id): JsonResponse
    {
        $order = PurchaseOrder::with('items')
            ->where('workspace_id', $workspace->id)
            ->findOrFail($id);

        return response()->json(['data' => $order]);
    }

    public function update(Request $request, Workspace $workspace, string $id): JsonResponse
    {
        $order = PurchaseOrder::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        $request->validate([
            'supplier_name' => 'sometimes|string|max:255',
            'supplier_email' => 'nullable|email|max:255',
            'currency' => 'sometimes|string|size:3',
            'order_date' => 'nullable|date',
            'expected_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'status' => 'sometimes|string|in:draft,sent,confirmed,received,cancelled',
            'items' => 'nullable|array',
            'items.*.id' => 'nullable|string',
            'items.*.product_id' => 'nullable|string|max:255',
            'items.*.description' => 'required_with:items|string|max:500',
            'items.*.quantity' => 'required_with:items|numeric|min:0.01',
            'items.*.unit_price' => 'required_with:items|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        return DB::transaction(function () use ($request, $order) {
            $data = $request->except('items');

            if ($request->has('items')) {
                $items = $request->items;
                $subtotal = collect($items)->sum(fn ($i) => $i['quantity'] * $i['unit_price']);
                $taxTotal = collect($items)->sum(fn ($i) => ($i['quantity'] * $i['unit_price']) * ($i['tax_rate'] ?? 0) / 100);

                $data['subtotal'] = $subtotal;
                $data['tax_total'] = $taxTotal;
                $data['total'] = $subtotal + $taxTotal;

                $order->update($data);
                $order->items()->delete();

                foreach ($items as $item) {
                    $itemTotal = $item['quantity'] * $item['unit_price'] * (1 + ($item['tax_rate'] ?? 0) / 100);
                    PurchaseOrderItem::create([
                        'purchase_order_id' => $order->id,
                        'product_id' => $item['product_id'] ?? null,
                        'description' => $item['description'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'tax_rate' => $item['tax_rate'] ?? 0,
                        'total' => $itemTotal,
                    ]);
                }
            } else {
                $order->update($data);
            }

            $order->load('items');

            return response()->json(['data' => $order]);
        });
    }

    public function destroy(Workspace $workspace, string $id): JsonResponse
    {
        $order = PurchaseOrder::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        $order->items()->delete();
        $order->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
