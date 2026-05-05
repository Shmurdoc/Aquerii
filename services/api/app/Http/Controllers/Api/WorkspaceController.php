<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WorkspaceController extends Controller
{
    // GET /workspaces/{workspace}
    public function show(Workspace $workspace): JsonResponse
    {
        return response()->json(['data' => $workspace->load('members.user')]);
    }

    // PATCH /workspaces/{workspace}
    public function update(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name'  => 'sometimes|string|max:100',
            'icon'  => 'sometimes|string|max:10',
            'color' => 'sometimes|string|max:20',
        ]);

        $workspace->update($validated);

        return response()->json(['data' => $workspace->fresh()]);
    }

    // GET /workspaces/{workspace}/members
    public function members(Workspace $workspace): JsonResponse
    {
        $members = DB::table('workspace_members')
            ->join('users', 'users.id', '=', 'workspace_members.user_id')
            ->where('workspace_members.workspace_id', $workspace->id)
            ->select('workspace_members.*', 'users.name', 'users.email', 'users.avatar_url')
            ->get();

        return response()->json(['data' => $members]);
    }

    // POST /workspaces/{workspace}/members
    public function inviteMember(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'role'  => 'required|in:admin,member,viewer',
        ]);

        $user = DB::table('users')->where('email', $validated['email'])->first();
        abort_unless($user, 404, 'User not found. They must register first.');

        $exists = DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $user->id)
            ->exists();
        abort_if($exists, 409, 'User is already a member.');

        DB::table('workspace_members')->insert([
            'id'           => Str::uuid(),
            'workspace_id' => $workspace->id,
            'user_id'      => $user->id,
            'role'         => $validated['role'],
            'joined_at'    => now(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return response()->json(['data' => ['invited' => true]], 201);
    }

    // DELETE /workspaces/{workspace}/members/{userId}
    public function removeMember(Request $request, Workspace $workspace, string $userId): JsonResponse
    {
        // Prevent removing yourself if owner
        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->first();

        abort_unless($member, 404);
        abort_if($member->role === 'owner' && $userId === $request->user()->id, 403, 'Owner cannot remove themselves.');

        DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->delete();

        return response()->json(['data' => ['removed' => true]]);
    }

    // PATCH /workspaces/{workspace}/members/{userId}
    public function updateMemberRole(Request $request, Workspace $workspace, string $userId): JsonResponse
    {
        $validated = $request->validate(['role' => 'required|in:admin,member,viewer']);

        DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->update(['role' => $validated['role'], 'updated_at' => now()]);

        return response()->json(['data' => ['updated' => true]]);
    }
}
