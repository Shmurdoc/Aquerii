<?php

namespace App\Core\Http\Controllers;

use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BoardColumnController extends Controller
{
    // GET /workspaces/{workspace}/boards/{board}/columns
    public function index(Workspace $workspace, string $boardId): JsonResponse
    {
        $columns = DB::table('board_columns')
            ->where('board_id', $boardId)
            ->orderBy('position')
            ->get();

        return response()->json(['data' => $columns]);
    }

    // POST /workspaces/{workspace}/boards/{board}/columns
    public function store(Request $request, Workspace $workspace, string $boardId): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'type' => 'required|string|in:text,number,date,select,people,status',
        ]);

        $maxPos = DB::table('board_columns')->where('board_id', $boardId)->max('position') ?? 0;
        $id = Str::uuid()->toString();

        DB::table('board_columns')->insert([
            'id' => $id,
            'board_id' => $boardId,
            'title' => $validated['title'],
            'type' => $validated['type'],
            'position' => $maxPos + 65536,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => ['id' => $id]], 201);
    }

    // GET /workspaces/{workspace}/boards/{board}/columns/{column}
    public function show(Workspace $workspace, string $boardId, string $columnId): JsonResponse
    {
        $column = DB::table('board_columns')
            ->where('id', $columnId)
            ->where('board_id', $boardId)
            ->firstOrFail();

        return response()->json(['data' => $column]);
    }

    // PATCH /workspaces/{workspace}/boards/{board}/columns/{column}
    public function update(Request $request, Workspace $workspace, string $boardId, string $columnId): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:100',
            'position' => 'sometimes|numeric',
            'settings' => 'sometimes|array',
        ]);

        if (isset($validated['settings'])) {
            $validated['settings'] = json_encode($validated['settings']);
        }
        $validated['updated_at'] = now();

        DB::table('board_columns')
            ->where('id', $columnId)
            ->where('board_id', $boardId)
            ->update($validated);

        return response()->json(['data' => ['updated' => true]]);
    }

    // DELETE /workspaces/{workspace}/boards/{board}/columns/{column}
    public function destroy(Workspace $workspace, string $boardId, string $columnId): JsonResponse
    {
        DB::table('board_columns')
            ->where('id', $columnId)
            ->where('board_id', $boardId)
            ->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
