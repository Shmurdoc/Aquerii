<?php

namespace App\Modules\Documents\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DocumentFolderController extends Controller
{
    public function index(Workspace $workspace): JsonResponse
    {
        $folders = DB::table('document_folders')
            ->where('workspace_id', $workspace->id)
            ->whereNull('deleted_at')
            ->orderBy('position')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $folders]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'sometimes|nullable|uuid|exists:document_folders,id',
        ]);

        $id = Str::uuid()->toString();
        DB::table('document_folders')->insert([
            'id' => $id,
            'workspace_id' => $workspace->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'created_by' => $request->user()->id,
            'name' => $validated['name'],
            'position' => DB::table('document_folders')
                ->where('workspace_id', $workspace->id)
                ->where('parent_id', $validated['parent_id'] ?? null)
                ->count() + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => ['id' => $id]], 201);
    }

    public function update(Request $request, Workspace $workspace, string $folderId): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'parent_id' => 'sometimes|nullable|uuid|exists:document_folders,id',
            'position' => 'sometimes|numeric',
        ]);

        $folder = DB::table('document_folders')
            ->where('id', $folderId)
            ->where('workspace_id', $workspace->id)
            ->whereNull('deleted_at')
            ->first();

        abort_unless($folder, 404);

        $validated['updated_at'] = now();
        DB::table('document_folders')
            ->where('id', $folderId)
            ->update($validated);

        return response()->json(['data' => ['updated' => true]]);
    }

    public function destroy(Workspace $workspace, string $folderId): JsonResponse
    {
        $folder = DB::table('document_folders')
            ->where('id', $folderId)
            ->where('workspace_id', $workspace->id)
            ->whereNull('deleted_at')
            ->first();

        abort_unless($folder, 404);

        DB::table('documents')
            ->where('folder_id', $folderId)
            ->update(['folder_id' => null]);

        DB::table('document_folders')
            ->where('parent_id', $folderId)
            ->update(['parent_id' => null]);

        DB::table('document_folders')
            ->where('id', $folderId)
            ->update(['deleted_at' => now()]);

        return response()->json(['data' => ['deleted' => true]]);
    }
}
