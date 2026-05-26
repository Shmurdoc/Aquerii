<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Inventory\Models\Product;
use App\Modules\Inventory\Models\StockItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockItemController extends Controller
{
    public function index(Workspace $workspace, Request $request): JsonResponse
    {
        $query = StockItem::with('product')
            ->where('workspace_id', $workspace->id);

        if ($productId = $request->get('product_id')) {
            $query->where('product_id', $productId);
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        $items = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 50));

        return response()->json($items);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|uuid|exists:products,id',
            'lot_number' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'quantity' => 'required|integer|min:0',
            'location' => 'nullable|string|max:255',
            'expiry_date' => 'nullable|date',
            'status' => 'nullable|string|in:in_stock,reserved,sold,damaged,expired',
        ]);

        $product = Product::where('workspace_id', $workspace->id)
            ->findOrFail($request->product_id);

        $item = StockItem::create([
            'workspace_id' => $workspace->id,
            'product_id' => $product->id,
            'lot_number' => $request->lot_number,
            'serial_number' => $request->serial_number,
            'quantity' => $request->quantity,
            'location' => $request->location,
            'expiry_date' => $request->expiry_date,
            'status' => $request->status ?? 'in_stock',
            'created_by' => $request->user()->id,
        ]);

        $item->load('product');

        return response()->json(['data' => $item], 201);
    }

    public function update(Request $request, Workspace $workspace, string $id): JsonResponse
    {
        $item = StockItem::with('product')
            ->where('workspace_id', $workspace->id)
            ->findOrFail($id);

        $request->validate([
            'lot_number' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'quantity' => 'sometimes|integer|min:0',
            'location' => 'nullable|string|max:255',
            'expiry_date' => 'nullable|date',
            'status' => 'nullable|string|in:in_stock,reserved,sold,damaged,expired',
        ]);

        $item->update($request->only([
            'lot_number', 'serial_number', 'quantity',
            'location', 'expiry_date', 'status',
        ]));

        $item->load('product');

        return response()->json(['data' => $item]);
    }

    public function destroy(Workspace $workspace, string $id): JsonResponse
    {
        $item = StockItem::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        $item->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function byProduct(Request $request, Workspace $workspace, string $product): JsonResponse
    {
        $product = Product::where('workspace_id', $workspace->id)->findOrFail($product);

        $items = StockItem::where('workspace_id', $workspace->id)
            ->where('product_id', $product->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $items]);
    }
}
