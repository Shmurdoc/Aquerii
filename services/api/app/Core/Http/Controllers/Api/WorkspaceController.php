<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Mail\WorkspaceInvitation;
use App\Core\Models\Board;
use App\Core\Models\Item;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class WorkspaceController extends Controller
{
    // POST /workspaces
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'icon' => 'nullable|string|max:10',
            'color' => 'nullable|string|max:20',
        ]);

        $workspace = DB::transaction(function () use ($validated, $request) {
            $slug = $this->uniqueSlug($validated['name']);

            $ws = Workspace::create([
                'name' => $validated['name'],
                'slug' => $slug,
                'icon' => $validated['icon'] ?? null,
                'color' => $validated['color'] ?? null,
            ]);

            WorkspaceMember::create([
                'workspace_id' => $ws->id,
                'user_id' => $request->user()->id,
                'role' => 'owner',
                'status' => 'active',
                'joined_at' => now(),
            ]);

            return $ws;
        });

        return response()->json(['data' => $workspace->load('members.user')], 201);
    }

    // GET /workspaces/{workspace}
    public function show(Workspace $workspace): JsonResponse
    {
        return response()->json(['data' => $workspace->load('members.user')]);
    }

    // PATCH /workspaces/{workspace}
    public function update(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'icon' => 'sometimes|string|max:10',
            'color' => 'sometimes|string|max:7|regex:/^#[0-9a-fA-F]{3,6}$/',
            'settings' => 'sometimes|array',
        ]);

        // Merge settings rather than overwriting
        if (isset($validated['settings'])) {
            $current = $workspace->settings ?? [];
            $validated['settings'] = array_merge($current, $validated['settings']);
        }

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
            'role' => 'required|in:admin,member,viewer',
        ]);

        $inviter = $request->user();
        $email = strtolower(trim($validated['email']));

        $user = DB::table('users')->where('email', $email)->first();

        // Check for an existing active membership
        if ($user) {
            $exists = DB::table('workspace_members')
                ->where('workspace_id', $workspace->id)
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->exists();
            abort_if($exists, 409, 'User is already a member of this workspace.');
        }

        // Check for an existing pending invite to the same email
        $pendingInvite = DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('invited_email', $email)
            ->where('status', 'pending')
            ->first();
        if ($pendingInvite) {
            return response()->json(['data' => ['invited' => true, 'note' => 'Invite already pending.']], 200);
        }

        $inviteToken = Str::random(40);

        DB::table('workspace_members')->insert([
            'id' => Str::uuid(),
            'workspace_id' => $workspace->id,
            'user_id' => $user?->id ?? null,
            'invited_email' => $email,
            'role' => $validated['role'],
            'status' => $user ? 'pending' : 'pending',
            'invited_by' => $inviter->id,
            'invite_token' => $inviteToken,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Mail::to($email)->queue(new WorkspaceInvitation(
            workspaceName: $workspace->name,
            inviterName: $inviter->name,
            inviteToken: $inviteToken,
            invitedEmail: $email,
            userExists: $user !== null,
            logoUrl: $workspace->logo_url ?? null,
            brandColor: $workspace->color ?? '#7c3aed',
        ));

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

        // Prevent demoting the sole owner
        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->first();

        abort_unless($member, 404);

        if ($member->role === 'owner' && $validated['role'] !== 'owner') {
            $ownerCount = DB::table('workspace_members')
                ->where('workspace_id', $workspace->id)
                ->where('role', 'owner')
                ->count();
            abort_if($ownerCount <= 1, 422, 'Cannot demote the sole owner. Assign another owner first.');
        }

        DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->update(['role' => $validated['role'], 'updated_at' => now()]);

        return response()->json(['data' => ['updated' => true]]);
    }

    // POST /invites/{token}/accept  (public route — token is the credential)
    public function acceptInvite(Request $request, string $token): JsonResponse
    {
        $invite = DB::table('workspace_members')
            ->where('invite_token', $token)
            ->where('status', 'pending')
            ->first();

        abort_unless($invite, 404, 'Invitation not found or already accepted.');

        // Invitations expire after 7 days
        $createdAt = Carbon::parse($invite->created_at);
        abort_if($createdAt->addDays(7)->isPast(), 410, 'Invitation has expired.');

        // Authenticated user accepts the invite
        $user = $request->user();
        abort_unless($user, 401, 'You must be logged in to accept an invitation.');

        // Verify email matches if the invite was for a specific address
        if ($invite->invited_email && strtolower($user->email) !== strtolower($invite->invited_email)) {
            return response()->json([
                'error' => ['code' => 'EMAIL_MISMATCH', 'message' => 'This invitation was sent to a different email address.'],
            ], 403);
        }

        DB::table('workspace_members')
            ->where('id', $invite->id)
            ->update([
                'user_id' => $user->id,
                'status' => 'active',
                'joined_at' => now(),
                'invite_token' => null,
                'updated_at' => now(),
            ]);

        return response()->json(['data' => ['accepted' => true, 'workspace_id' => $invite->workspace_id]]);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    // GET /workspaces/{workspace}/search?q=...
    public function search(Request $request, string $workspace): JsonResponse
    {
        $q = trim($request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json(['data' => []]);
        }

        $like = "%{$q}%";

        // Items
        $items = Item::whereHas('board', fn ($bq) => $bq->where('workspace_id', $workspace))
            ->whereNull('parent_id')
            ->whereNull('deleted_at')
            ->where('title', 'ilike', $like)
            ->select('id', 'title', 'board_id', 'status')
            ->limit(10)
            ->get()
            ->map(fn ($i) => array_merge($i->toArray(), ['type' => 'item']));

        // Boards
        $boards = Board::where('workspace_id', $workspace)
            ->whereNull('deleted_at')
            ->where('name', 'ilike', $like)
            ->select('id', 'name as title', 'type')
            ->limit(5)
            ->get()
            ->map(fn ($b) => array_merge($b->toArray(), ['type' => 'board']));

        // CRM deals (if table exists)
        $deals = collect();
        if (DB::getSchemaBuilder()->hasTable('crm_deals')) {
            $deals = DB::table('crm_deals')
                ->where('workspace_id', $workspace)
                ->whereNull('deleted_at')
                ->where('title', 'ilike', $like)
                ->select('id', 'title', DB::raw("'deal' as type"))
                ->limit(5)
                ->get();
        }

        // CRM contacts (if table exists)
        $contacts = collect();
        if (DB::getSchemaBuilder()->hasTable('crm_contacts')) {
            $contacts = DB::table('crm_contacts')
                ->where('workspace_id', $workspace)
                ->whereNull('deleted_at')
                ->where(function ($cq) use ($like) {
                    $cq->where('first_name', 'ilike', $like)
                        ->orWhere('last_name', 'ilike', $like)
                        ->orWhere('email', 'ilike', $like);
                })
                ->selectRaw("id, CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,'')) as title, 'contact' as type")
                ->limit(5)
                ->get();
        }

        $results = $items->concat($boards)->concat($deals)->concat($contacts)->values();

        return response()->json(['data' => $results]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;
        while (Workspace::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
