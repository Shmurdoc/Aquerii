<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockController extends Controller
{
    public function show(string $workspace, Product $product): JsonResponse
    {
        $in = (int) StockMovement::where('product_id', $product->id)
            ->where('type', 'in')
            ->sum('quantity');

        $out = (int) StockMovement::where('product_id', $product->id)
            ->where('type', 'out')
            ->sum('quantity');

        $adjustment = (int) StockMovement::where('product_id', $product->id)
            ->where('type', 'adjustment')
            ->sum('quantity');

        $currentStock = $in - $out + $adjustment;
        $lowStockThreshold = config('inventory.low_stock_threshold', 10);

        return response()->json([
            'data' => [
                'product_id' => $product->id,
                'current_stock' => max(0, $currentStock),
                'is_low_stock' => $currentStock <= $lowStockThreshold,
                'low_stock_threshold' => $lowStockThreshold,
            ],
        ]);
    }

    public function adjust(Request $request, string $workspace, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|in:in,out,adjustment',
            'quantity' => 'required|integer|min:1',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $movement = DB::transaction(function () use ($validated, $product, $request) {
            return StockMovement::create([
                'workspace_id' => $product->workspace_id,
                'product_id' => $product->id,
                'quantity' => $validated['quantity'],
                'type' => $validated['type'],
                'reference' => $validated['reference'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);
        });

        return response()->json(['data' => $movement], 201);
    }

    public function movements(string $workspace, Product $product): JsonResponse
    {
        $movements = StockMovement::where('product_id', $product->id)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($movements);
    }
}
