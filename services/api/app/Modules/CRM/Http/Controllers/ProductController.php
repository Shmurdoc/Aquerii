<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $products = CrmProduct::where('workspace_id', $workspace->id)
            ->when($request->category, fn($q, $v) => $q->where('category', $v))
            ->when($request->search, fn($q, $v) => $q->where('name', 'ilike', "%{$v}%"))
            ->when($request->boolean('active_only'), fn($q) => $q->where('is_active', true))
            ->with('creator:id,name')
            ->orderBy('name')
            ->paginate(25);

        return response()->json(['data' => $products]);
    }

    public function show(Workspace $workspace, CrmProduct $product): JsonResponse
    {
        abort_if($product->workspace_id !== $workspace->id, 404);
        return response()->json(['data' => $product->load('creator:id,name')]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'sku'         => 'nullable|string|max:100',
            'unit_price'  => 'required|numeric|min:0',
            'currency'    => 'sometimes|string|size:3',
            'category'    => 'nullable|string|max:100',
            'attributes'  => 'nullable|array',
            'image_url'   => 'nullable|url',
        ]);

        $data['workspace_id'] = $workspace->id;
        $data['created_by'] = $request->user()->id;

        $product = CrmProduct::create($data);

        return response()->json(['data' => $product], 201);
    }

    public function update(Request $request, Workspace $workspace, CrmProduct $product): JsonResponse
    {
        abort_if($product->workspace_id !== $workspace->id, 404);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'sku'         => 'nullable|string|max:100',
            'unit_price'  => 'sometimes|numeric|min:0',
            'currency'    => 'sometimes|string|size:3',
            'category'    => 'nullable|string|max:100',
            'attributes'  => 'nullable|array',
            'image_url'   => 'nullable|url',
            'is_active'   => 'boolean',
        ]);

        $product->update($data);

        return response()->json(['data' => $product->fresh()]);
    }

    public function destroy(Workspace $workspace, CrmProduct $product): JsonResponse
    {
        abort_if($product->workspace_id !== $workspace->id, 404);
        $product->delete();
        return response()->json(['message' => 'Deleted'], 200);
    }
}
