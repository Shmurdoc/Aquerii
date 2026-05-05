<?php

namespace App\Http\Controllers;

use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BoardGroupController extends Controller
{
    // GET /workspaces/{workspace}/boards/{board}/groups
    public function index(Workspace $workspace, string $boardId): JsonResponse
    {
        $groups = DB::table('groups')
            ->where('board_id', $boardId)
            ->orderBy('position')
            ->get();

        return response()->json(['data' => $groups]);
    }

    // POST /workspaces/{workspace}/boards/{board}/groups
    public function store(Request $request, Workspace $workspace, string $boardId): JsonResponse
    {
        $validated = $request->validate([
            'name'  => 'required|string|max:100',
            'color' => 'sometimes|string|max:20',
        ]);

        $maxPos = DB::table('groups')->where('board_id', $boardId)->max('position') ?? 0;
        $id     = Str::uuid()->toString();

        DB::table('groups')->insert([
            'id'         => $id,
            'board_id'   => $boardId,
            'name'       => $validated['name'],
            'color'      => $validated['color'] ?? '#6366f1',
            'position'   => $maxPos + 65536,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => ['id' => $id]], 201);
    }

    // PATCH /workspaces/{workspace}/boards/{board}/groups/{group}
    public function update(Request $request, Workspace $workspace, string $boardId, string $groupId): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'sometimes|string|max:100',
            'color'    => 'sometimes|string|max:20',
            'position' => 'sometimes|numeric',
        ]);
        $validated['updated_at'] = now();

        DB::table('groups')
            ->where('id', $groupId)
            ->where('board_id', $boardId)
            ->update($validated);

        return response()->json(['data' => ['updated' => true]]);
    }

    // DELETE /workspaces/{workspace}/boards/{board}/groups/{group}
    public function destroy(Workspace $workspace, string $boardId, string $groupId): JsonResponse
    {
        DB::table('groups')
            ->where('id', $groupId)
            ->where('board_id', $boardId)
            ->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
