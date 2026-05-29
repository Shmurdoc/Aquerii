<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\FieldPermission;
use App\Core\Models\ScimToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class FieldPermissionController extends Controller
{
    public function index(Request $request, string $workspace): JsonResponse
    {
        $permissions = FieldPermission::where('workspace_id', $workspace)
            ->orderBy('entity_type')
            ->orderBy('field_name')
            ->orderBy('role')
            ->get();

        return response()->json(['data' => $permissions]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'entity_type' => 'required|string|max:100',
            'field_name' => 'required|string|max:100',
            'role' => 'required|string|in:owner,admin,member,viewer',
            'permission' => 'required|string|in:read,write,hidden',
        ]);

        $permission = FieldPermission::updateOrCreate(
            [
                'workspace_id' => $workspace,
                'entity_type' => $data['entity_type'],
                'field_name' => $data['field_name'],
                'role' => $data['role'],
            ],
            ['permission' => $data['permission']]
        );

        return response()->json(['data' => $permission]);
    }

    public function destroy(Request $request, string $workspace, string $permission): JsonResponse
    {
        FieldPermission::where('workspace_id', $workspace)->findOrFail($permission)->delete();

        return response()->json(['message' => 'Deleted']);
    }

    public function bulkUpdate(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'permissions' => 'required|array',
            'permissions.*.entity_type' => 'required|string',
            'permissions.*.field_name' => 'required|string',
            'permissions.*.role' => 'required|string',
            'permissions.*.permission' => 'required|string|in:read,write,hidden',
        ]);

        foreach ($data['permissions'] as $perm) {
            FieldPermission::updateOrCreate(
                [
                    'workspace_id' => $workspace,
                    'entity_type' => $perm['entity_type'],
                    'field_name' => $perm['field_name'],
                    'role' => $perm['role'],
                ],
                ['permission' => $perm['permission']]
            );
        }

        return response()->json(['message' => 'Permissions updated']);
    }

    // ── SCIM 2.0 Endpoints ──────────────────────────────────────────────────

    public function scimTokens(Request $request, string $workspace): JsonResponse
    {
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
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'scope' => 'nullable|string|in:users,groups',
        ]);

        $rawToken = ScimToken::generate($workspace, $data['name'], $data['scope'] ?? 'users');

        return response()->json([
            'token' => $rawToken,
            'message' => 'Save this token securely. It will not be shown again.',
        ], 201);
    }

    public function scimTokenRevoke(Request $request, string $workspace, string $token): JsonResponse
    {
        ScimToken::where('workspace_id', $workspace)
            ->where('id', $token)
            ->update(['is_active' => false]);

        return response()->json(['message' => 'Token revoked']);
    }

    public function scimUsersProvision(Request $request, string $workspace): JsonResponse
    {
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
        $name = ($data['name']['givenName'] ?? '') . ' ' . ($data['name']['familyName'] ?? '');

        $user = \App\Core\Models\User::firstOrCreate(
            ['email' => $email],
            ['name' => trim($name) ?: $email]
        );

        // Add to workspace if not already a member
        $workspaceModel = \App\Core\Models\Workspace::find($workspace);
        if ($workspaceModel) {
            $workspaceModel->members()->syncWithoutDetaching([
                $user->id => ['role' => 'member', 'status' => 'active'],
            ]);
        }

        return response()->json([
            'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:User'],
            'id' => $user->id,
            'userName' => $user->email,
            'name' => ['givenName' => $user->name, 'familyName' => ''],
            'active' => true,
        ]);
    }
}
