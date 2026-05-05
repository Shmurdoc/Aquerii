<?php

namespace App\Http\Controllers;

use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BoardColumnController extends Controller
{
    // GET /workspaces/{workspace}/boards/{board}/columns
    public function index(Workspace $workspace, string $boardId): JsonResponse
    {
        $columns = DB::table('columns')
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
            'type'  => 'required|string|in:text,number,date,select,people,status',
        ]);

        $maxPos = DB::table('columns')->where('board_id', $boardId)->max('position') ?? 0;
        $id     = Str::uuid()->toString();

        DB::table('columns')->insert([
            'id'         => $id,
            'board_id'   => $boardId,
            'title'      => $validated['title'],
            'type'       => $validated['type'],
            'position'   => $maxPos + 65536,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => ['id' => $id]], 201);
    }

    // PATCH /workspaces/{workspace}/boards/{board}/columns/{column}
    public function update(Request $request, Workspace $workspace, string $boardId, string $columnId): JsonResponse
    {
        $validated = $request->validate([
            'title'    => 'sometimes|string|max:100',
            'position' => 'sometimes|numeric',
            'settings' => 'sometimes|array',
        ]);

        if (isset($validated['settings'])) {
            $validated['settings'] = json_encode($validated['settings']);
        }
        $validated['updated_at'] = now();

        DB::table('columns')
            ->where('id', $columnId)
            ->where('board_id', $boardId)
            ->update($validated);

        return response()->json(['data' => ['updated' => true]]);
    }

    // DELETE /workspaces/{workspace}/boards/{board}/columns/{column}
    public function destroy(Workspace $workspace, string $boardId, string $columnId): JsonResponse
    {
        DB::table('columns')
            ->where('id', $columnId)
            ->where('board_id', $boardId)
            ->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
