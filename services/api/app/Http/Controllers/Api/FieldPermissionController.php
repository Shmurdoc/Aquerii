<?php

namespace App\Http\Controllers\Api;

use App\Core\Models\FieldPermission;
use App\Core\Models\ScimToken;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Services\AuditService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class FieldPermissionController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request, string $workspace): JsonResponse
    {
        $query = FieldPermission::query()
            ->where('workspace_id', $workspace);

        if ($request->filled('entity_type')) {
            $query->where('entity_type', strtolower((string) $request->query('entity_type')));
        }

        if ($request->filled('role')) {
            $query->where('role', strtolower((string) $request->query('role')));
        }

        if ($request->filled('field_name')) {
            $query->where('field_name', strtolower((string) $request->query('field_name')));
        }

        $permissions = $query
            ->orderBy('entity_type')
            ->orderBy('field_name')
            ->orderBy('role')
            ->paginate(min(200, max(1, (int) $request->query('per_page', 100))));

        return response()->json([
            'data' => $permissions->items(),
            'meta' => [
                'total' => $permissions->total(),
                'per_page' => $permissions->perPage(),
                'current_page' => $permissions->currentPage(),
                'last_page' => $permissions->lastPage(),
            ],
        ]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $data = $request->validate([
            'entity_type' => 'required|string|max:100',
            'field_name' => 'required|string|max:100',
            'role' => 'required|string|in:owner,admin,member,viewer',
            'permission' => 'required|string|in:read,write,hidden',
        ]);

        $entityType = strtolower(trim($data['entity_type']));
        $fieldName = strtolower(trim($data['field_name']));
        $role = strtolower(trim($data['role']));
        $permissionValue = strtolower(trim($data['permission']));

        $permission = FieldPermission::updateOrCreate(
            [
                'workspace_id' => $workspace,
                'entity_type' => $entityType,
                'field_name' => $fieldName,
                'role' => $role,
            ],
            ['permission' => $permissionValue]
        );

        $this->safeAudit('field_permission.upsert', $workspace, $request->user()?->id, 'field_permission', (string) $permission->id, [], [
            'entity_type' => $permission->entity_type,
            'field_name' => $permission->field_name,
            'role' => $permission->role,
            'permission' => $permission->permission,
        ]);

        return response()->json(['data' => $permission]);
    }

    public function destroy(Request $request, string $workspace, string $permission): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $model = FieldPermission::where('workspace_id', $workspace)->findOrFail($permission);
        $before = $model->toArray();
        $model->delete();

        $this->safeAudit('field_permission.delete', $workspace, $request->user()?->id, 'field_permission', $permission, $before, []);

        return response()->json(['message' => 'Deleted']);
    }

    public function bulkUpdate(Request $request, string $workspace): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $data = $request->validate([
            'permissions' => 'required|array',
            'permissions.*.entity_type' => 'required|string',
            'permissions.*.field_name' => 'required|string',
            'permissions.*.role' => 'required|string',
            'permissions.*.permission' => 'required|string|in:read,write,hidden',
        ]);

        $now = now();
        $rows = [];

        foreach ($data['permissions'] as $perm) {
            $rows[] = [
                'workspace_id' => $workspace,
                'entity_type' => strtolower(trim($perm['entity_type'])),
                'field_name' => strtolower(trim($perm['field_name'])),
                'role' => strtolower(trim($perm['role'])),
                'permission' => strtolower(trim($perm['permission'])),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('field_permissions')->upsert(
            $rows,
            ['workspace_id', 'entity_type', 'field_name', 'role'],
            ['permission', 'updated_at']
        );

        $this->safeAudit('field_permission.bulk_upsert', $workspace, $request->user()?->id, 'field_permission', null, [], [
            'count' => count($rows),
        ]);

        return response()->json(['message' => 'Permissions updated']);
    }

    // ── SCIM 2.0 Endpoints ──────────────────────────────────────────────────

    public function scimTokens(Request $request, string $workspace): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $tokens = ScimToken::where('workspace_id', $workspace)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'scope' => $t->scope,
                'is_active' => $t->is_active,
                'last_used_at' => $t->last_used_at,
                'created_at' => $t->created_at,
            ]);

        return response()->json(['data' => $tokens]);
    }

    public function scimTokenCreate(Request $request, string $workspace): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'scope' => ['nullable', 'string', 'regex:/^(users|groups)(,(users|groups))*$/i'],
        ]);

        $rawToken = ScimToken::generate($workspace, $data['name'], $data['scope'] ?? 'users');

        $createdToken = ScimToken::where('workspace_id', $workspace)
            ->where('name', $data['name'])
            ->orderByDesc('created_at')
            ->first();

        $this->safeAudit('scim.token.created', $workspace, $request->user()?->id, 'scim_token', (string) ($createdToken?->id), [], [
            'name' => $data['name'],
            'scope' => $data['scope'] ?? 'users',
        ]);

        return response()->json([
            'token' => $rawToken,
            'message' => 'Save this token securely. It will not be shown again.',
        ], 201);
    }

    public function scimTokenRevoke(Request $request, string $workspace, string $token): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $before = ScimToken::where('workspace_id', $workspace)
            ->where('id', $token)
            ->first();

        $updated = ScimToken::where('workspace_id', $workspace)
            ->where('id', $token)
            ->update(['is_active' => false]);

        abort_unless($updated > 0, 404, 'SCIM token not found.');

        $this->safeAudit('scim.token.revoked', $workspace, $request->user()?->id, 'scim_token', $token, $before?->toArray() ?? [], ['is_active' => false]);

        return response()->json(['message' => 'Token revoked']);
    }

    public function scimUsersProvision(Request $request, string $workspace): JsonResponse
    {
        // Support bearer SCIM token auth for IdP callers, while preserving
        // authenticated admin usage for manual testing and bootstrap flows.
        $scimToken = $this->resolveScimToken($request, $workspace);
        if (! $scimToken) {
            $this->requireWorkspaceAdmin($request, $workspace);
        } elseif (! $scimToken->hasScope('users')) {
            abort(403, 'SCIM token scope does not allow user provisioning.');
        }

        // SCIM 2.0 User provisioning endpoint
        $data = $request->validate([
            'schemas' => 'required|array',
            'userName' => 'required|email',
            'name' => 'nullable|array',
            'name.givenName' => 'nullable|string',
            'name.familyName' => 'nullable|string',
            'emails' => 'nullable|array',
            'active' => 'nullable|boolean',
        ]);

        // Find or create user
        $email = $data['userName'];
        $name = ($data['name']['givenName'] ?? '').' '.($data['name']['familyName'] ?? '');

        $user = User::withTrashed()->firstOrCreate(
            ['email' => $email],
            ['name' => trim($name) ?: $email]
        );
        if ($user->trashed()) {
            $user->restore();
        }

        // Add to workspace if not already a member
        $workspaceModel = Workspace::find($workspace);
        if ($workspaceModel) {
            $workspaceModel->members()->syncWithoutDetaching([
                $user->id => ['role' => 'member', 'status' => 'active'],
            ]);
        }

        $this->safeAudit('scim.user.provisioned', $workspace, $request->user()?->id, 'user', (string) $user->id, [], [
            'email' => $user->email,
            'via_token' => $scimToken !== null,
        ]);

        return response()->json([
            'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:User'],
            'id' => $user->id,
            'userName' => $user->email,
            'name' => ['givenName' => $user->name, 'familyName' => ''],
            'active' => true,
        ]);
    }

    private function resolveScimToken(Request $request, string $workspaceId): ?ScimToken
    {
        $auth = (string) $request->header('Authorization', '');
        if (! str_starts_with($auth, 'Bearer ')) {
            return null;
        }

        $rawToken = trim(substr($auth, 7));
        if ($rawToken === '') {
            return null;
        }

        $token = ScimToken::verify($rawToken);
        if (! $token || $token->workspace_id !== $workspaceId) {
            return null;
        }

        return $token;
    }

    private function requireWorkspaceAdmin(Request $request, string $workspaceId): void
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first(['role']);

        abort_if(! $member || ! in_array($member->role, ['owner', 'admin'], true), 403, 'Insufficient role for this action.');
    }

    private function safeAudit(
        string $action,
        ?string $workspaceId,
        ?string $userId,
        ?string $resourceType,
        ?string $resourceId,
        array $before,
        array $after
    ): void {
        try {
            $this->audit->log(
                action: $action,
                workspaceId: $workspaceId,
                userId: $userId,
                resourceType: $resourceType,
                resourceId: $resourceId,
                before: $before,
                after: $after,
            );
        } catch (Throwable) {
            // Audit logging must never break provisioning or permission ops.
        }
    }
}
