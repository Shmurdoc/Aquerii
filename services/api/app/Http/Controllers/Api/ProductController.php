<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = Product::with('category')
            ->where('workspace_id', $request->route('workspace'))
            ->paginate(50);

        return response()->json(['data' => $products]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|uuid|exists:inventory_categories,id',
            'sku' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'unit_price' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
        ]);
        $validated['workspace_id'] = $request->route('workspace');
        $validated['created_by'] = $request->user()->id;

        $product = DB::transaction(function () use ($validated) {
            return Product::create($validated);
        });

        return response()->json(['data' => $product], 201);
    }

    public function show(string $workspace, Product $product): JsonResponse
    {
        $product->load('category', 'stockMovements');

        return response()->json(['data' => $product]);
    }

    public function update(Request $request, string $workspace, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category_id' => 'nullable|uuid|exists:inventory_categories,id',
            'sku' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'unit_price' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
        ]);

        $product->update($validated);

        return response()->json(['data' => $product->fresh()]);
    }

    public function destroy(string $workspace, Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['data' => null], 204);
    }
}
