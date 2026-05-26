<?php

namespace App\Modules\Sales\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Sales\Models\SalesOrder;
use App\Modules\Sales\Models\SalesOrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SalesOrderController extends Controller
{
    public function index(Workspace $workspace, Request $request): JsonResponse
    {
        $query = SalesOrder::with('items')
            ->where('workspace_id', $workspace->id);

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%");
            });
        }

        $orders = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 50));

        return response()->json($orders);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $request->validate([
            'customer_id' => 'nullable|string|max:255',
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'currency' => 'nullable|string|size:3',
            'order_date' => 'nullable|date',
            'expected_date' => 'nullable|date|after_or_equal:order_date',
            'shipping_address' => 'nullable|string',
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

            $order = SalesOrder::create([
                'workspace_id' => $workspace->id,
                'order_number' => 'SO-'.strtoupper(Str::random(8)),
                'customer_id' => $request->customer_id,
                'customer_name' => $request->customer_name,
                'customer_email' => $request->customer_email,
                'status' => 'draft',
                'currency' => $request->currency ?? 'USD',
                'subtotal' => $subtotal,
                'tax_total' => $taxTotal,
                'total' => $subtotal + $taxTotal,
                'order_date' => $request->order_date ?? now(),
                'expected_date' => $request->expected_date,
                'shipping_address' => $request->shipping_address,
                'notes' => $request->notes,
                'created_by' => $request->user()->id,
            ]);

            foreach ($items as $item) {
                $itemTotal = $item['quantity'] * $item['unit_price'] * (1 + ($item['tax_rate'] ?? 0) / 100);
                SalesOrderItem::create([
                    'sales_order_id' => $order->id,
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
        $order = SalesOrder::with('items')
            ->where('workspace_id', $workspace->id)
            ->findOrFail($id);

        return response()->json(['data' => $order]);
    }

    public function update(Request $request, Workspace $workspace, string $id): JsonResponse
    {
        $order = SalesOrder::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        $request->validate([
            'customer_name' => 'sometimes|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'currency' => 'sometimes|string|size:3',
            'order_date' => 'nullable|date',
            'expected_date' => 'nullable|date',
            'shipping_address' => 'nullable|string',
            'notes' => 'nullable|string',
            'status' => 'sometimes|string|in:draft,quotation,confirmed,shipped,delivered,cancelled',
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
                    SalesOrderItem::create([
                        'sales_order_id' => $order->id,
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
        $order = SalesOrder::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        $order->items()->delete();
        $order->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
