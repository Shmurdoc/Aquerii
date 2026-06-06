<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Mail\WorkspaceInvitation;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Core\Services\UsageService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class WorkspaceController extends Controller
{
    // GET /workspaces
    public function index(Request $request): JsonResponse
    {
        $workspaces = $request->user()->workspaces()->get();

        return response()->json(['data' => $workspaces]);
    }

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
    public function removeMember(Request $request, Workspace $workspace, string $userId, UsageService $usage): JsonResponse
    {
        // Prevent removing yourself if owner
        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->first();

        abort_unless($member, 404);

        if ($member->role === 'owner' && $request->user()->id === $userId) {
            return response()->json(['error' => 'Owners cannot remove themselves.'], 422);
        }

        DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->delete();

        if ($member->status === 'active') {
            $usage->decrement($workspace, 'seats');
        }

        return response()->json(['data' => ['removed' => true]], 200);
    }

    // PATCH /workspaces/{workspace}/members/{userId}
    public function updateMemberRole(Request $request, Workspace $workspace, string $userId): JsonResponse
    {
        $validated = $request->validate([
            'role' => 'sometimes|required|in:admin,member,viewer',
            'position_id' => ['sometimes', 'nullable', 'integer', Rule::exists((new Role)->getTable(), 'id')],
            'department_role_id' => ['sometimes', 'nullable', 'integer', Rule::exists((new Role)->getTable(), 'id')],
        ]);

        // Prevent demoting the sole owner
        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->first();

        abort_unless($member, 404);

        if (array_key_exists('role', $validated) && $member->role === 'owner' && $validated['role'] !== 'owner') {
            $ownerCount = DB::table('workspace_members')
                ->where('workspace_id', $workspace->id)
                ->where('role', 'owner')
                ->count();
            abort_if($ownerCount <= 1, 422, 'Cannot demote the sole owner. Assign another owner first.');
        }

        $update = ['updated_at' => now()];

        if (array_key_exists('role', $validated)) {
            $update['role'] = $validated['role'];
        }

        if (array_key_exists('position_id', $validated)) {
            $update['position_id'] = $validated['position_id'];
        }

        if (array_key_exists('department_role_id', $validated)) {
            $update['department_role_id'] = $validated['department_role_id'];
        }

        DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->update($update);

        return response()->json(['data' => ['updated' => true]]);
    }

    // POST /invites/{token}/accept  (public route — token is the credential)
    public function acceptInvite(Request $request, string $token, UsageService $usage): JsonResponse
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

        $workspace = Workspace::findOrFail($invite->workspace_id);
        $usage->enforce($workspace, 'seats');

        DB::table('workspace_members')
            ->where('id', $invite->id)
            ->update([
                'user_id' => $user->id,
                'status' => 'active',
                'joined_at' => now(),
                'invite_token' => null,
                'updated_at' => now(),
            ]);

        $usage->increment($workspace, 'seats');

        return response()->json(['data' => ['accepted' => true, 'workspace_id' => $invite->workspace_id]]);
    }

    // DELETE /workspaces/{workspace}
    public function destroy(Workspace $workspace): JsonResponse
    {
        $workspace->delete();

        return response()->json(null, 204);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    // GET /workspaces/{workspace}/search?q=...
    public function search(Request $request, string $workspace): JsonResponse
    {
        $q = trim($request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json(['data' => [], 'sections' => []]);
        }

        $like = "%{$this->escapeLike($q)}%";
        $records = $this->searchRecords($workspace, $like);
        $modules = $this->searchModuleCommands($q);
        $actions = $this->searchActionCommands($q, $workspace);
        $templates = $this->searchTemplates($workspace, $like);
        $reports = $this->searchReports($q, $workspace);
        $recent = $this->recentEntities($workspace, $q);

        $sections = collect([
            ['key' => 'records', 'label' => 'Records', 'items' => $records],
            ['key' => 'modules', 'label' => 'Modules', 'items' => $modules],
            ['key' => 'actions', 'label' => 'Actions', 'items' => $actions],
            ['key' => 'templates', 'label' => 'Templates', 'items' => $templates],
            ['key' => 'reports', 'label' => 'Reports', 'items' => $reports],
            ['key' => 'recent', 'label' => 'Recent Activity', 'items' => $recent],
        ])->map(fn (array $section) => [
            'key' => $section['key'],
            'label' => $section['label'],
            'items' => $section['items']->values()->all(),
        ])->filter(fn (array $section) => count($section['items']) > 0)->values();

        $flat = $sections->flatMap(fn (array $section) => $section['items'])->values();

        return response()->json([
            'data' => $flat,
            'sections' => $sections,
        ]);
    }

    private function searchRecords(string $workspace, string $like): Collection
    {
        $results = collect();

        if (DB::getSchemaBuilder()->hasTable('items') && DB::getSchemaBuilder()->hasTable('boards')) {
            $items = DB::table('items')
                ->join('boards', 'boards.id', '=', 'items.board_id')
                ->where('boards.workspace_id', $workspace)
                ->whereNull('items.deleted_at')
                ->whereNull('items.parent_id')
                ->where('items.title', 'ilike', $like)
                ->select('items.id', 'items.title', 'items.board_id')
                ->limit(10)
                ->get()
                ->map(fn ($i) => [
                    'id' => (string) $i->id,
                    'title' => $i->title,
                    'subtitle' => 'Board item',
                    'type' => 'item',
                    'to' => '/boards',
                ]);
            $results = $results->concat($items);
        }

        if (DB::getSchemaBuilder()->hasTable('boards')) {
            $boards = DB::table('boards')
                ->where('workspace_id', $workspace)
                ->whereNull('deleted_at')
                ->where('name', 'ilike', $like)
                ->select('id', 'name')
                ->limit(8)
                ->get()
                ->map(fn ($b) => [
                    'id' => (string) $b->id,
                    'title' => $b->name,
                    'subtitle' => 'Board',
                    'type' => 'board',
                    'to' => '/boards/'.$b->id,
                ]);
            $results = $results->concat($boards);
        }

        if (DB::getSchemaBuilder()->hasTable('crm_deals')) {
            $deals = DB::table('crm_deals')
                ->where('workspace_id', $workspace)
                ->whereNull('deleted_at')
                ->where('title', 'ilike', $like)
                ->select('id', 'title')
                ->limit(8)
                ->get()
                ->map(fn ($d) => [
                    'id' => (string) $d->id,
                    'title' => $d->title,
                    'subtitle' => 'CRM deal',
                    'type' => 'deal',
                    'to' => '/crm',
                ]);
            $results = $results->concat($deals);
        }

        if (DB::getSchemaBuilder()->hasTable('crm_contacts')) {
            $contacts = DB::table('crm_contacts')
                ->where('workspace_id', $workspace)
                ->whereNull('deleted_at')
                ->where(function ($cq) use ($like) {
                    $cq->where('first_name', 'ilike', $like)
                        ->orWhere('last_name', 'ilike', $like)
                        ->orWhere('email', 'ilike', $like);
                })
                ->selectRaw("id, CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,'')) as full_name, email")
                ->limit(8)
                ->get()
                ->map(fn ($c) => [
                    'id' => (string) $c->id,
                    'title' => trim((string) $c->full_name) !== '' ? trim((string) $c->full_name) : ($c->email ?? 'Contact'),
                    'subtitle' => $c->email ? 'Contact · '.$c->email : 'Contact',
                    'type' => 'contact',
                    'to' => '/crm',
                ]);
            $results = $results->concat($contacts);
        }

        if (DB::getSchemaBuilder()->hasTable('crm_companies')) {
            $companies = DB::table('crm_companies')
                ->where('workspace_id', $workspace)
                ->whereNull('deleted_at')
                ->where('name', 'ilike', $like)
                ->select('id', 'name', 'entity_type')
                ->limit(8)
                ->get()
                ->map(fn ($c) => [
                    'id' => (string) $c->id,
                    'title' => $c->name,
                    'subtitle' => 'Company · '.($c->entity_type ?? 'customer'),
                    'type' => 'company',
                    'to' => '/crm',
                ]);
            $results = $results->concat($companies);
        }

        if (DB::getSchemaBuilder()->hasTable('documents')) {
            $docs = DB::table('documents')
                ->where('workspace_id', $workspace)
                ->whereNull('deleted_at')
                ->where('title', 'ilike', $like)
                ->select('id', 'title')
                ->limit(8)
                ->get()
                ->map(fn ($d) => [
                    'id' => (string) $d->id,
                    'title' => $d->title,
                    'subtitle' => 'Document',
                    'type' => 'document',
                    'to' => '/documents/'.$d->id,
                ]);
            $results = $results->concat($docs);
        }

        return $results->take(30)->values();
    }

    private function searchModuleCommands(string $q): Collection
    {
        $modules = collect([
            ['id' => 'module-dashboard', 'title' => 'Dashboard', 'subtitle' => 'Workspace overview', 'type' => 'module', 'to' => '/dashboard'],
            ['id' => 'module-boards', 'title' => 'Boards', 'subtitle' => 'Projects and task delivery', 'type' => 'module', 'to' => '/boards'],
            ['id' => 'module-crm', 'title' => 'CRM', 'subtitle' => 'Leads, contacts, deals, companies', 'type' => 'module', 'to' => '/crm'],
            ['id' => 'module-documents', 'title' => 'Documents', 'subtitle' => 'Files, docs, and attachments', 'type' => 'module', 'to' => '/documents'],
            ['id' => 'module-email', 'title' => 'Email', 'subtitle' => 'Threads, outbound, and inbound', 'type' => 'module', 'to' => '/email'],
            ['id' => 'module-support', 'title' => 'Support', 'subtitle' => 'Tickets and SLA operations', 'type' => 'module', 'to' => '/support'],
            ['id' => 'module-marketing', 'title' => 'Marketing', 'subtitle' => 'Campaigns, segments, templates', 'type' => 'module', 'to' => '/marketing'],
            ['id' => 'module-reports', 'title' => 'Reports', 'subtitle' => 'KPIs and analytics', 'type' => 'module', 'to' => '/reports'],
            ['id' => 'module-automation', 'title' => 'Automation', 'subtitle' => 'Automation rules and runs', 'type' => 'module', 'to' => '/automation'],
            ['id' => 'module-settings', 'title' => 'Settings', 'subtitle' => 'Workspace and controls', 'type' => 'module', 'to' => '/settings'],
        ]);

        $needle = mb_strtolower($q);

        return $modules
            ->filter(fn (array $m) => str_contains(mb_strtolower($m['title'].' '.$m['subtitle']), $needle))
            ->take(10)
            ->values();
    }

    private function searchActionCommands(string $q, string $workspace): Collection
    {
        $actions = collect([
            ['id' => 'action-new-board', 'title' => 'Create New Board', 'subtitle' => 'Start a delivery board', 'type' => 'action', 'to' => '/boards/new'],
            ['id' => 'action-new-deal', 'title' => 'Create New Deal', 'subtitle' => 'Add opportunity in CRM', 'type' => 'action', 'to' => '/crm/deals/new'],
            ['id' => 'action-new-contact', 'title' => 'Create New Contact', 'subtitle' => 'Add a CRM contact', 'type' => 'action', 'to' => '/crm/contacts/new'],
            ['id' => 'action-new-document', 'title' => 'Create New Document', 'subtitle' => 'Open document editor', 'type' => 'action', 'to' => '/documents/new'],
            ['id' => 'action-new-automation', 'title' => 'Create New Automation', 'subtitle' => 'Build workflow automation', 'type' => 'action', 'to' => '/automation/new'],
            ['id' => 'action-invite-member', 'title' => 'Invite Workspace Member', 'subtitle' => 'Add admin/member/viewer', 'type' => 'action', 'to' => '/settings/members'],
            ['id' => 'action-view-audit', 'title' => 'Open Audit Logs', 'subtitle' => 'Review sensitive activity', 'type' => 'action', 'to' => '/settings/security'],
            ['id' => 'action-scim-tokens', 'title' => 'Manage SCIM Tokens', 'subtitle' => 'Enterprise provisioning controls', 'type' => 'action', 'to' => '/settings/security'],
        ]);

        $needle = mb_strtolower($q);

        return $actions
            ->filter(fn (array $m) => str_contains(mb_strtolower($m['title'].' '.$m['subtitle']), $needle))
            ->take(10)
            ->values();
    }

    private function searchTemplates(string $workspace, string $like): Collection
    {
        $results = collect();

        if (DB::getSchemaBuilder()->hasTable('automation_templates')) {
            $automationTemplates = DB::table('automation_templates')
                ->where(function ($q) use ($like) {
                    $q->where('name', 'ilike', $like)
                        ->orWhere('description', 'ilike', $like)
                        ->orWhere('category', 'ilike', $like);
                })
                ->select('id', 'name', 'category')
                ->limit(10)
                ->get()
                ->map(fn ($tpl) => [
                    'id' => (string) $tpl->id,
                    'title' => $tpl->name,
                    'subtitle' => 'Automation template'.($tpl->category ? ' · '.$tpl->category : ''),
                    'type' => 'template',
                    'to' => '/automation',
                ]);
            $results = $results->concat($automationTemplates);
        }

        if (DB::getSchemaBuilder()->hasTable('email_templates')) {
            $emailTemplates = DB::table('email_templates')
                ->where('workspace_id', $workspace)
                ->where(function ($q) use ($like) {
                    $q->where('name', 'ilike', $like)
                        ->orWhere('subject', 'ilike', $like);
                })
                ->select('id', 'name', 'subject')
                ->limit(10)
                ->get()
                ->map(fn ($tpl) => [
                    'id' => (string) $tpl->id,
                    'title' => $tpl->name,
                    'subtitle' => 'Email template'.($tpl->subject ? ' · '.$tpl->subject : ''),
                    'type' => 'template',
                    'to' => '/marketing/email-templates',
                ]);
            $results = $results->concat($emailTemplates);
        }

        return $results->take(20)->values();
    }

    private function searchReports(string $q, string $workspace): Collection
    {
        $catalog = collect([
            ['id' => 'report-dashboard', 'title' => 'Executive Dashboard', 'subtitle' => 'Cross-module KPI summary', 'type' => 'report', 'to' => '/reports'],
            ['id' => 'report-crm-revenue', 'title' => 'CRM Revenue Report', 'subtitle' => 'Pipeline and won-deal trends', 'type' => 'report', 'to' => '/reports'],
            ['id' => 'report-sales-forecast', 'title' => 'Sales Forecast', 'subtitle' => 'Forecast and attainment', 'type' => 'report', 'to' => '/reports'],
            ['id' => 'report-support-sla', 'title' => 'Support SLA Report', 'subtitle' => 'Ticket SLA performance', 'type' => 'report', 'to' => '/reports'],
            ['id' => 'report-automation-runs', 'title' => 'Automation Runs', 'subtitle' => 'Run history and failures', 'type' => 'report', 'to' => '/automation'],
        ]);

        $needle = mb_strtolower($q);

        return $catalog
            ->filter(fn (array $r) => str_contains(mb_strtolower($r['title'].' '.$r['subtitle']), $needle))
            ->take(10)
            ->values();
    }

    private function recentEntities(string $workspace, string $q): Collection
    {
        $needle = mb_strtolower($q);
        $results = collect();

        if (DB::getSchemaBuilder()->hasTable('items') && DB::getSchemaBuilder()->hasTable('boards')) {
            $items = DB::table('items')
                ->join('boards', 'boards.id', '=', 'items.board_id')
                ->where('boards.workspace_id', $workspace)
                ->whereNull('items.deleted_at')
                ->select('items.id', 'items.title', 'items.updated_at')
                ->orderByDesc('items.updated_at')
                ->limit(10)
                ->get()
                ->map(fn ($i) => [
                    'id' => (string) $i->id,
                    'title' => $i->title,
                    'subtitle' => 'Recent board activity',
                    'type' => 'recent',
                    'to' => '/boards',
                    '_sort' => $i->updated_at,
                ]);
            $results = $results->concat($items);
        }

        if (DB::getSchemaBuilder()->hasTable('crm_deals')) {
            $deals = DB::table('crm_deals')
                ->where('workspace_id', $workspace)
                ->whereNull('deleted_at')
                ->select('id', 'title', 'updated_at')
                ->orderByDesc('updated_at')
                ->limit(10)
                ->get()
                ->map(fn ($d) => [
                    'id' => (string) $d->id,
                    'title' => $d->title,
                    'subtitle' => 'Recent CRM activity',
                    'type' => 'recent',
                    'to' => '/crm',
                    '_sort' => $d->updated_at,
                ]);
            $results = $results->concat($deals);
        }

        return $results
            ->filter(fn (array $item) => str_contains(mb_strtolower($item['title'].' '.$item['subtitle']), $needle))
            ->sortByDesc('_sort')
            ->take(10)
            ->map(function (array $item) {
                unset($item['_sort']);

                return $item;
            })
            ->values();
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
