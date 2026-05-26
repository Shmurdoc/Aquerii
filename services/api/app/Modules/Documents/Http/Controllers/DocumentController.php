<?php

namespace App\Modules\Documents\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    // GET /workspaces/{workspace}/documents
    public function index(Workspace $workspace): JsonResponse
    {
        $docs = DB::table('documents')
            ->where('workspace_id', $workspace->id)
            ->whereNull('deleted_at')
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json(['data' => $docs]);
    }

    // POST /workspaces/{workspace}/documents
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'folder_id' => 'sometimes|nullable|uuid',
            'linked_item_id' => 'sometimes|nullable|uuid|exists:items,id',
            'icon' => 'sometimes|string|max:10',
        ]);

        $id = Str::uuid()->toString();
        DB::table('documents')->insert([
            'id' => $id,
            'workspace_id' => $workspace->id,
            'title' => $validated['title'] ?? 'Untitled',
            'folder_id' => $validated['folder_id'] ?? null,
            'linked_item_id' => $validated['linked_item_id'] ?? null,
            'icon' => $validated['icon'] ?? null,
            'created_by' => $request->user()->id,
            'content' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => ['id' => $id]], 201);
    }

    // GET /workspaces/{workspace}/documents/{document}
    public function show(Workspace $workspace, string $docId): JsonResponse
    {
        $doc = DB::table('documents')
            ->where('id', $docId)
            ->where('workspace_id', $workspace->id)
            ->whereNull('deleted_at')
            ->first();

        abort_unless($doc, 404);

        return response()->json(['data' => $doc]);
    }

    // PATCH /workspaces/{workspace}/documents/{document}
    public function update(Request $request, Workspace $workspace, string $docId): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes',
            'icon' => 'sometimes|nullable|string|max:10',
        ]);

        if (isset($validated['content']) && ! is_string($validated['content'])) {
            $validated['content'] = json_encode($validated['content']);
        }

        $validated['updated_at'] = now();

        DB::table('documents')
            ->where('id', $docId)
            ->where('workspace_id', $workspace->id)
            ->update($validated);

        return response()->json(['data' => ['updated' => true]]);
    }

    // DELETE /workspaces/{workspace}/documents/{document}
    public function destroy(Workspace $workspace, string $docId): JsonResponse
    {
        DB::table('documents')
            ->where('id', $docId)
            ->where('workspace_id', $workspace->id)
            ->update(['deleted_at' => now()]);

        return response()->json(['data' => ['deleted' => true]]);
    }
}
