<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CommentController extends Controller
{
    // GET /workspaces/{workspace}/items/{itemId}/comments
    public function index(Request $request, Workspace $workspace, string $itemId): JsonResponse
    {
        $comments = DB::table('comments')
            ->where('item_id', $itemId)
            ->orderBy('created_at')
            ->get();

        // Attach author names
        $userIds = $comments->pluck('user_id')->unique();
        $users   = DB::table('users')->whereIn('id', $userIds)->pluck('name', 'id');

        $data = $comments->map(fn($c) => [
            'id'         => $c->id,
            'body'       => $c->body,
            'user_id'    => $c->user_id,
            'author'     => ['id' => $c->user_id, 'name' => $users[$c->user_id] ?? 'Unknown'],
            'created_at' => $c->created_at,
            'updated_at' => $c->updated_at,
        ]);

        return response()->json(['data' => $data]);
    }

    // POST /workspaces/{workspace}/items/{itemId}/comments
    public function store(Request $request, Workspace $workspace, string $itemId): JsonResponse
    {
        $validated = $request->validate(['body' => 'required|string|max:10000']);

        $id = Str::uuid()->toString();
        DB::table('comments')->insert([
            'id'         => $id,
            'item_id'    => $itemId,
            'user_id'    => $request->user()->id,
            'body'       => $validated['body'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => ['id' => $id]], 201);
    }

    // PATCH /workspaces/{workspace}/items/{itemId}/comments/{comment}
    public function update(Request $request, Workspace $workspace, string $itemId, string $commentId): JsonResponse
    {
        $validated = $request->validate(['body' => 'required|string|max:10000']);

        DB::table('comments')
            ->where('id', $commentId)
            ->where('user_id', $request->user()->id)
            ->update(['body' => $validated['body'], 'updated_at' => now()]);

        return response()->json(['data' => ['updated' => true]]);
    }

    // DELETE /workspaces/{workspace}/items/{itemId}/comments/{comment}
    public function destroy(Request $request, Workspace $workspace, string $itemId, string $commentId): JsonResponse
    {
        DB::table('comments')
            ->where('id', $commentId)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
