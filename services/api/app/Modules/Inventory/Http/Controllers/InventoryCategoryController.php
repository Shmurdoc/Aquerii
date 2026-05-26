<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Inventory\Models\InventoryCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryCategoryController extends Controller
{
    public function index(Workspace $workspace): JsonResponse
    {
        $categories = InventoryCategory::where('workspace_id', $workspace->id)
            ->orderBy('position')
            ->get();

        return response()->json(['data' => $categories]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|uuid|exists:inventory_categories,id',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
        ]);

        $category = InventoryCategory::create([
            'workspace_id' => $workspace->id,
            'parent_id' => $request->parent_id,
            'name' => $request->name,
            'description' => $request->description,
            'color' => $request->color,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $category], 201);
    }

    public function show(Workspace $workspace, string $id): JsonResponse
    {
        $category = InventoryCategory::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        return response()->json(['data' => $category]);
    }

    public function update(Request $request, Workspace $workspace, string $id): JsonResponse
    {
        $category = InventoryCategory::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'parent_id' => 'nullable|uuid|exists:inventory_categories,id',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
        ]);

        $category->update($request->only(['name', 'parent_id', 'description', 'color']));

        return response()->json(['data' => $category]);
    }

    public function destroy(Workspace $workspace, string $id): JsonResponse
    {
        $category = InventoryCategory::where('workspace_id', $workspace->id)
            ->findOrFail($id);

        $category->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
