<?php

namespace App\Http\Controllers\Api;

use App\Core\Models\Workspace;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return ProductResource::collection(Product::paginate(50));
    }

    public function store(StoreProductRequest $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validated();
        $validated['workspace_id'] = $workspace->id;
        $validated['created_by'] = $request->user()->id;

        $product = DB::transaction(function () use ($validated) {
            return Product::create($validated);
        });

        return response()->json(['data' => new ProductResource($product)], 201);
    }

    public function show(Workspace $workspace, string $product): JsonResponse
    {
        $product = Product::where('workspace_id', $workspace->id)->findOrFail($product);

        return response()->json(['data' => new ProductResource($product)]);
    }

    public function update(UpdateProductRequest $request, Workspace $workspace, string $product): JsonResponse
    {
        $product = Product::where('workspace_id', $workspace->id)->findOrFail($product);
        $product->update($request->validated());

        return response()->json(['data' => new ProductResource($product->fresh())]);
    }

    public function destroy(Workspace $workspace, string $product): JsonResponse
    {
        $product = Product::where('workspace_id', $workspace->id)->findOrFail($product);
        $product->delete();

        return response()->json(['data' => null], 204);
    }
}
