<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\WorkspaceInvite;
use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class WorkspaceInvitationController extends Controller
{
    // POST /workspaces/{workspace}/invitations
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'role' => 'sometimes|in:admin,member,viewer',
        ]);

        $email = strtolower($validated['email']);
        $role = $validated['role'] ?? 'member';

        // Don't invite existing members
        $existingUser = DB::table('users')->where('email', $email)->first();
        if ($existingUser) {
            $isMember = DB::table('workspace_members')
                ->where('workspace_id', $workspace->id)
                ->where('user_id', $existingUser->id)
                ->exists();
            abort_if($isMember, 409, 'User is already a member of this workspace.');
        }

        // Revoke any existing pending invitation for this email
        WorkspaceInvitation::where('workspace_id', $workspace->id)
            ->where('email', $email)
            ->whereNull('accepted_at')
            ->delete();

        $invitation = WorkspaceInvitation::create([
            'workspace_id' => $workspace->id,
            'email' => $email,
            'role' => $role,
            'token' => Str::uuid()->toString(),
            'invited_by' => $request->user()->name,
            'expires_at' => now()->addDays(7),
        ]);

        // Load the workspace relationship for the mail
        $invitation->load('workspace');

        Mail::to($email)->queue(new WorkspaceInvite($invitation, $request->user()->name));

        return response()->json(['data' => $invitation], 201);
    }

    // GET /workspaces/{workspace}/invitations
    public function index(Workspace $workspace): JsonResponse
    {
        $invitations = WorkspaceInvitation::where('workspace_id', $workspace->id)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $invitations]);
    }

    // DELETE /workspaces/{workspace}/invitations/{token}
    public function destroy(Workspace $workspace, string $token): JsonResponse
    {
        $deleted = WorkspaceInvitation::where('workspace_id', $workspace->id)
            ->where('token', $token)
            ->delete();

        abort_unless($deleted, 404);

        return response()->json(['data' => ['revoked' => true]]);
    }

    // GET /invitations/{token}/accept  (public, no workspace prefix)
    public function accept(string $token): JsonResponse
    {
        $invitation = WorkspaceInvitation::where('token', $token)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->firstOrFail();

        $invitation->load('workspace');

        // If a user with this email already exists, add them immediately
        $user = DB::table('users')->where('email', $invitation->email)->first();

        if ($user) {
            $alreadyMember = DB::table('workspace_members')
                ->where('workspace_id', $invitation->workspace_id)
                ->where('user_id', $user->id)
                ->exists();

            if (! $alreadyMember) {
                DB::table('workspace_members')->insert([
                    'id' => Str::uuid(),
                    'workspace_id' => $invitation->workspace_id,
                    'user_id' => $user->id,
                    'role' => $invitation->role,
                    'joined_at' => now(),
                    'created_at' => now(),
                ]);
            }

            $invitation->update(['accepted_at' => now()]);

            return response()->json([
                'data' => [
                    'status' => 'joined',
                    'workspace_id' => $invitation->workspace_id,
                    'workspace' => $invitation->workspace->only(['id', 'name', 'slug', 'icon', 'color']),
                ],
            ]);
        }

        // No account yet — return invite metadata so the frontend can pre-fill register
        return response()->json([
            'data' => [
                'status' => 'register_required',
                'email' => $invitation->email,
                'workspace_name' => $invitation->workspace->name,
                'role' => $invitation->role,
                'token' => $token,
            ],
        ]);
    }
}
