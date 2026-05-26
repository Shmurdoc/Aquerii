<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Inventory\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Workspace $workspace, Request $request): JsonResponse
    {
        $query = Product::with(['category', 'stockItems'])
            ->where('workspace_id', $workspace->id);

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($categoryId = $request->get('category_id')) {
            $query->where('category_id', $categoryId);
        }

        $products = $query->orderBy('name')
            ->paginate($request->get('per_page', 50));

        return response()->json($products);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|uuid|exists:inventory_categories,id',
            'sku' => 'nullable|string|max:100|unique:products,sku,NULL,id,workspace_id,'.$workspace->id,
            'barcode' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'unit_price' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'currency' => 'nullable|string|size:3',
            'attributes' => 'nullable|json',
        ]);

        $product = Product::create([
            'workspace_id' => $workspace->id,
            'category_id' => $request->category_id,
            'name' => $request->name,
            'sku' => $request->sku,
            'barcode' => $request->barcode,
            'description' => $request->description,
            'unit_price' => $request->unit_price ?? 0,
            'unit' => $request->unit ?? 'pc',
            'currency' => $request->currency ?? 'USD',
            'attributes' => $request->attributes ? json_decode($request->attributes, true) : null,
            'created_by' => $request->user()->id,
        ]);

        $product->load(['category', 'stockItems']);

        return response()->json(['data' => $product], 201);
    }

    public function show(Workspace $workspace, string $id): JsonResponse
    {
        $product = Product::with(['category', 'stockItems'])
            ->where('workspace_id', $workspace->id)
            ->findOrFail($id);

        return response()->json(['data' => $product]);
    }

    public function update(Request $request, Workspace $workspace, string $id): JsonResponse
    {
        $product = Product::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'category_id' => 'nullable|uuid|exists:inventory_categories,id',
            'sku' => 'nullable|string|max:100|unique:products,sku,'.$id.',id,workspace_id,'.$workspace->id,
            'barcode' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'unit_price' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'currency' => 'nullable|string|size:3',
            'attributes' => 'nullable|json',
        ]);

        $data = $request->only([
            'name', 'category_id', 'sku', 'barcode', 'description',
            'unit_price', 'unit', 'currency',
        ]);

        if ($request->has('attributes')) {
            $data['attributes'] = $request->attributes ? json_decode($request->attributes, true) : null;
        }

        $product->update($data);
        $product->load(['category', 'stockItems']);

        return response()->json(['data' => $product]);
    }

    public function destroy(Workspace $workspace, string $id): JsonResponse
    {
        $product = Product::withCount('stockItems')
            ->where('workspace_id', $workspace->id)
            ->findOrFail($id);

        if ($product->stock_items_count > 0) {
            abort(409, 'Cannot delete product with existing stock items.');
        }

        $product->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
