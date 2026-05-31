<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\EmployeeGroup;
use App\Core\Models\ScimIdentity;
use App\Core\Models\ScimToken;
use App\Core\Models\User;
use App\Core\Models\WorkspaceMember;
use App\Core\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class ScimController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function serviceProviderConfig(): JsonResponse
    {
        return $this->scimResponse([
            'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
            'patch' => ['supported' => true],
            'bulk' => ['supported' => false, 'maxOperations' => 0, 'maxPayloadSize' => 0],
            'filter' => ['supported' => true, 'maxResults' => 200],
            'changePassword' => ['supported' => false],
            'sort' => ['supported' => true],
            'etag' => ['supported' => false],
            'authenticationSchemes' => [[
                'type' => 'oauthbearertoken',
                'name' => 'Bearer Token',
                'description' => 'Use bearer token from SCIM token management.',
            ]],
        ]);
    }

    public function schemas(): JsonResponse
    {
        return $this->scimResponse([
            'Resources' => [
                [
                    'id' => 'urn:ietf:params:scim:schemas:core:2.0:User',
                    'name' => 'User',
                    'description' => 'SCIM core user schema',
                ],
                [
                    'id' => 'urn:ietf:params:scim:schemas:core:2.0:Group',
                    'name' => 'Group',
                    'description' => 'SCIM core group schema',
                ],
            ],
            'totalResults' => 2,
            'itemsPerPage' => 2,
            'startIndex' => 1,
            'schemas' => ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        ]);
    }

    public function schemaById(Request $request, string $id): JsonResponse
    {
        $decoded = urldecode($id);

        if ($decoded === 'urn:ietf:params:scim:schemas:core:2.0:User') {
            return $this->scimResponse([
                'id' => $decoded,
                'name' => 'User',
                'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:Schema'],
            ]);
        }

        if ($decoded === 'urn:ietf:params:scim:schemas:core:2.0:Group') {
            return $this->scimResponse([
                'id' => $decoded,
                'name' => 'Group',
                'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:Schema'],
            ]);
        }

        return $this->scimError(404, 'Schema not found.');
    }

    public function resourceTypes(): JsonResponse
    {
        return $this->scimResponse([
            'Resources' => [
                [
                    'id' => 'User',
                    'name' => 'User',
                    'endpoint' => '/Users',
                    'schema' => 'urn:ietf:params:scim:schemas:core:2.0:User',
                ],
                [
                    'id' => 'Group',
                    'name' => 'Group',
                    'endpoint' => '/Groups',
                    'schema' => 'urn:ietf:params:scim:schemas:core:2.0:Group',
                ],
            ],
            'totalResults' => 2,
            'itemsPerPage' => 2,
            'startIndex' => 1,
            'schemas' => ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        ]);
    }

    public function listUsers(Request $request): JsonResponse
    {
        $workspaceId = $this->workspaceId($request);

        $query = User::query()
            ->join('workspace_members as wm', 'wm.user_id', '=', 'users.id')
            ->leftJoin('scim_identities as si', function ($join) use ($workspaceId) {
                $join->on('si.user_id', '=', 'users.id')
                    ->where('si.workspace_id', '=', $workspaceId);
            })
            ->where('wm.workspace_id', $workspaceId)
            ->where('wm.status', 'active')
            ->select('users.*', 'si.external_id as scim_external_id');

        if ($request->filled('filter')) {
            $this->applyUserFilter($query, (string) $request->query('filter'));
        }

        $startIndex = max(1, (int) $request->query('startIndex', 1));
        $count = min(200, max(1, (int) $request->query('count', 100)));

        $total = (clone $query)->count();
        $rows = $query
            ->orderBy('users.email')
            ->offset($startIndex - 1)
            ->limit($count)
            ->get();

        $resources = $rows->map(fn ($row) => $this->toScimUser($row, $workspaceId))->values();

        return $this->scimResponse([
            'schemas' => ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            'totalResults' => $total,
            'itemsPerPage' => $resources->count(),
            'startIndex' => $startIndex,
            'Resources' => $resources,
        ]);
    }

    public function createUser(Request $request): JsonResponse
    {
        $token = $this->scimToken($request);
        if (! $token->hasScope('users')) {
            return $this->scimError(403, 'Token does not include users scope.');
        }

        $workspaceId = $this->workspaceId($request);

        $data = $request->validate([
            'schemas' => 'required|array',
            'userName' => 'required|email',
            'externalId' => 'nullable|string|max:255',
            'name' => 'nullable|array',
            'name.givenName' => 'nullable|string|max:255',
            'name.familyName' => 'nullable|string|max:255',
            'emails' => 'nullable|array',
            'active' => 'nullable|boolean',
        ]);

        $email = strtolower((string) $data['userName']);
        $displayName = trim(($data['name']['givenName'] ?? '').' '.($data['name']['familyName'] ?? ''));
        $name = $displayName !== '' ? $displayName : $email;

        $user = User::firstOrCreate(
            ['email' => $email],
            ['name' => $name]
        );

        WorkspaceMember::updateOrCreate(
            ['workspace_id' => $workspaceId, 'user_id' => $user->id],
            [
                'role' => 'member',
                'status' => (($data['active'] ?? true) ? 'active' : 'suspended'),
                'joined_at' => now(),
            ]
        );

        $identity = $this->upsertIdentity($workspaceId, $user->id, $data['externalId'] ?? null, $request->all());

        $this->safeAudit('scim.user.create', $workspaceId, null, 'user', (string) $user->id, [], [
            'external_id' => $identity->external_id,
            'email' => $user->email,
        ]);

        return $this->scimResponse(
            $this->toScimUser($user, $workspaceId, $identity->external_id),
            201
        );
    }

    public function showUser(Request $request, string $id): JsonResponse
    {
        $workspaceId = $this->workspaceId($request);

        $resolved = $this->resolveUserByScimId($workspaceId, $id);
        if (! $resolved) {
            return $this->scimError(404, 'User not found.');
        }

        return $this->scimResponse($this->toScimUser($resolved['user'], $workspaceId, $resolved['external_id']));
    }

    public function replaceUser(Request $request, string $id): JsonResponse
    {
        $token = $this->scimToken($request);
        if (! $token->hasScope('users')) {
            return $this->scimError(403, 'Token does not include users scope.');
        }

        $workspaceId = $this->workspaceId($request);
        $resolved = $this->resolveUserByScimId($workspaceId, $id);
        if (! $resolved) {
            return $this->scimError(404, 'User not found.');
        }

        $data = $request->validate([
            'userName' => 'required|email',
            'name' => 'nullable|array',
            'name.givenName' => 'nullable|string|max:255',
            'name.familyName' => 'nullable|string|max:255',
            'active' => 'nullable|boolean',
        ]);

        $user = $resolved['user'];
        $before = [
            'email' => $user->email,
            'name' => $user->name,
            'status' => WorkspaceMember::where('workspace_id', $workspaceId)->where('user_id', $user->id)->value('status'),
        ];
        $name = trim(($data['name']['givenName'] ?? '').' '.($data['name']['familyName'] ?? ''));

        $user->update([
            'email' => strtolower((string) $data['userName']),
            'name' => $name !== '' ? $name : $user->name,
        ]);

        WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)
            ->update(['status' => (($data['active'] ?? true) ? 'active' : 'suspended'), 'updated_at' => now()]);

        $this->safeAudit('scim.user.replace', $workspaceId, null, 'user', (string) $user->id, $before, [
            'email' => $user->fresh()->email,
            'name' => $user->fresh()->name,
            'status' => WorkspaceMember::where('workspace_id', $workspaceId)->where('user_id', $user->id)->value('status'),
        ]);

        return $this->scimResponse($this->toScimUser($user->fresh(), $workspaceId, $resolved['external_id']));
    }

    public function patchUser(Request $request, string $id): JsonResponse
    {
        $token = $this->scimToken($request);
        if (! $token->hasScope('users')) {
            return $this->scimError(403, 'Token does not include users scope.');
        }

        $workspaceId = $this->workspaceId($request);
        $resolved = $this->resolveUserByScimId($workspaceId, $id);
        if (! $resolved) {
            return $this->scimError(404, 'User not found.');
        }

        $data = $request->validate([
            'Operations' => 'required|array|min:1',
            'Operations.*.op' => 'required|string|in:add,replace,remove',
            'Operations.*.path' => 'nullable|string',
            'Operations.*.value' => 'nullable',
        ]);

        $user = $resolved['user'];
        $before = [
            'email' => $user->email,
            'name' => $user->name,
            'status' => WorkspaceMember::where('workspace_id', $workspaceId)->where('user_id', $user->id)->value('status'),
        ];
        $wmQuery = WorkspaceMember::where('workspace_id', $workspaceId)->where('user_id', $user->id);

        foreach ($data['Operations'] as $operation) {
            $path = strtolower((string) ($operation['path'] ?? ''));
            $op = strtolower((string) $operation['op']);
            $value = $operation['value'] ?? null;

            if (($path === 'active' || $path === '')) {
                if ($op === 'remove') {
                    $wmQuery->update(['status' => 'suspended', 'updated_at' => now()]);
                } elseif (is_bool($value)) {
                    $wmQuery->update(['status' => ($value ? 'active' : 'suspended'), 'updated_at' => now()]);
                }
            }

            if ($path === 'username' && is_string($value) && filter_var($value, FILTER_VALIDATE_EMAIL)) {
                $user->update(['email' => strtolower($value)]);
            }

            if ($path === 'name.givenname' && is_string($value)) {
                $parts = preg_split('/\s+/', trim((string) $user->name));
                $family = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';
                $user->update(['name' => trim($value.' '.$family)]);
            }

            if ($path === 'name.familyname' && is_string($value)) {
                $parts = preg_split('/\s+/', trim((string) $user->name));
                $given = $parts[0] ?? '';
                $user->update(['name' => trim($given.' '.$value)]);
            }
        }

        $freshUser = $user->fresh();

        $this->safeAudit('scim.user.patch', $workspaceId, null, 'user', (string) $freshUser->id, $before, [
            'email' => $freshUser->email,
            'name' => $freshUser->name,
            'status' => WorkspaceMember::where('workspace_id', $workspaceId)->where('user_id', $freshUser->id)->value('status'),
        ]);

        return $this->scimResponse($this->toScimUser($freshUser, $workspaceId, $resolved['external_id']));
    }

    public function deleteUser(Request $request, string $id): JsonResponse
    {
        $token = $this->scimToken($request);
        if (! $token->hasScope('users')) {
            return $this->scimError(403, 'Token does not include users scope.');
        }

        $workspaceId = $this->workspaceId($request);
        $resolved = $this->resolveUserByScimId($workspaceId, $id);
        if (! $resolved) {
            return $this->scimError(404, 'User not found.');
        }

        WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('user_id', $resolved['user']->id)
            ->update(['status' => 'suspended', 'updated_at' => now()]);

        $this->safeAudit('scim.user.delete', $workspaceId, null, 'user', (string) $resolved['user']->id, [], [
            'status' => 'suspended',
        ]);

        return $this->scimResponse([], 204);
    }

    public function listGroups(Request $request): JsonResponse
    {
        $workspaceId = $this->workspaceId($request);

        $groups = EmployeeGroup::where('workspace_id', $workspaceId)
            ->orderBy('name')
            ->get();

        $resources = $groups->map(fn (EmployeeGroup $g) => $this->toScimGroup($g));

        return $this->scimResponse([
            'schemas' => ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            'totalResults' => $resources->count(),
            'itemsPerPage' => $resources->count(),
            'startIndex' => 1,
            'Resources' => $resources,
        ]);
    }

    public function createGroup(Request $request): JsonResponse
    {
        $token = $this->scimToken($request);
        if (! $token->hasScope('groups')) {
            return $this->scimError(403, 'Token does not include groups scope.');
        }

        $workspaceId = $this->workspaceId($request);
        $data = $request->validate([
            'displayName' => 'required|string|max:255',
            'members' => 'nullable|array',
            'members.*.value' => 'required|string',
        ]);

        $group = EmployeeGroup::create([
            'workspace_id' => $workspaceId,
            'name' => $data['displayName'],
        ]);

        $this->syncGroupMembers($workspaceId, $group, $data['members'] ?? []);

        $this->safeAudit('scim.group.create', $workspaceId, null, 'employee_group', (string) $group->id, [], [
            'name' => $group->name,
        ]);

        return $this->scimResponse($this->toScimGroup($group->fresh('members.user')), 201);
    }

    public function showGroup(Request $request, string $id): JsonResponse
    {
        $workspaceId = $this->workspaceId($request);
        $group = EmployeeGroup::where('workspace_id', $workspaceId)->find($id);

        if (! $group) {
            return $this->scimError(404, 'Group not found.');
        }

        return $this->scimResponse($this->toScimGroup($group->load('members.user')));
    }

    public function replaceGroup(Request $request, string $id): JsonResponse
    {
        $token = $this->scimToken($request);
        if (! $token->hasScope('groups')) {
            return $this->scimError(403, 'Token does not include groups scope.');
        }

        $workspaceId = $this->workspaceId($request);
        $group = EmployeeGroup::where('workspace_id', $workspaceId)->find($id);
        if (! $group) {
            return $this->scimError(404, 'Group not found.');
        }

        $data = $request->validate([
            'displayName' => 'required|string|max:255',
            'members' => 'nullable|array',
            'members.*.value' => 'required|string',
        ]);

        $before = ['name' => $group->name];
        $group->update(['name' => $data['displayName']]);
        $this->syncGroupMembers($workspaceId, $group, $data['members'] ?? []);

        $this->safeAudit('scim.group.replace', $workspaceId, null, 'employee_group', (string) $group->id, $before, [
            'name' => $group->name,
        ]);

        return $this->scimResponse($this->toScimGroup($group->fresh('members.user')));
    }

    public function patchGroup(Request $request, string $id): JsonResponse
    {
        $token = $this->scimToken($request);
        if (! $token->hasScope('groups')) {
            return $this->scimError(403, 'Token does not include groups scope.');
        }

        $workspaceId = $this->workspaceId($request);
        $group = EmployeeGroup::where('workspace_id', $workspaceId)->find($id);
        if (! $group) {
            return $this->scimError(404, 'Group not found.');
        }

        $data = $request->validate([
            'Operations' => 'required|array|min:1',
            'Operations.*.op' => 'required|string|in:add,replace,remove',
            'Operations.*.path' => 'nullable|string',
            'Operations.*.value' => 'nullable',
        ]);

        $before = ['name' => $group->name];

        foreach ($data['Operations'] as $operation) {
            $op = strtolower((string) $operation['op']);
            $path = strtolower((string) ($operation['path'] ?? ''));
            $value = $operation['value'] ?? null;

            if (($path === 'displayname' || $path === '') && is_string($value)) {
                $group->update(['name' => $value]);
            }

            if ($path === 'members' && is_array($value)) {
                if ($op === 'replace') {
                    $this->syncGroupMembers($workspaceId, $group, $value);
                }
                if ($op === 'add') {
                    $this->syncGroupMembers($workspaceId, $group, array_merge(
                        $group->members()->with('user')->get()->map(fn ($m) => ['value' => (string) $m->user_id])->all(),
                        $value
                    ));
                }
                if ($op === 'remove') {
                    $removeIds = collect($value)->pluck('value')->filter()->values()->all();
                    WorkspaceMember::where('workspace_id', $workspaceId)
                        ->where('employee_group_id', $group->id)
                        ->whereIn('user_id', $removeIds)
                        ->update(['employee_group_id' => null, 'updated_at' => now()]);
                }
            }
        }

        $freshGroup = $group->fresh('members.user');

        $this->safeAudit('scim.group.patch', $workspaceId, null, 'employee_group', (string) $group->id, $before, [
            'name' => $freshGroup->name,
        ]);

        return $this->scimResponse($this->toScimGroup($freshGroup));
    }

    public function deleteGroup(Request $request, string $id): JsonResponse
    {
        $token = $this->scimToken($request);
        if (! $token->hasScope('groups')) {
            return $this->scimError(403, 'Token does not include groups scope.');
        }

        $workspaceId = $this->workspaceId($request);
        $group = EmployeeGroup::where('workspace_id', $workspaceId)->find($id);
        if (! $group) {
            return $this->scimError(404, 'Group not found.');
        }

        WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('employee_group_id', $group->id)
            ->update(['employee_group_id' => null, 'updated_at' => now()]);

        $before = ['name' => $group->name];
        $group->delete();

        $this->safeAudit('scim.group.delete', $workspaceId, null, 'employee_group', (string) $id, $before, []);

        return $this->scimResponse([], 204);
    }

    private function applyUserFilter($query, string $filter): void
    {
        if (preg_match('/^userName\s+eq\s+"([^"]+)"$/i', $filter, $m)) {
            $query->where('users.email', strtolower($m[1]));
            return;
        }

        if (preg_match('/^externalId\s+eq\s+"([^"]+)"$/i', $filter, $m)) {
            $query->where('si.external_id', $m[1]);
        }
    }

    private function resolveUserByScimId(string $workspaceId, string $id): ?array
    {
        $identity = ScimIdentity::where('workspace_id', $workspaceId)
            ->where('external_id', $id)
            ->first();

        if ($identity) {
            $user = User::find($identity->user_id);
            if (! $user) {
                return null;
            }

            return ['user' => $user, 'external_id' => $identity->external_id];
        }

        $user = User::find($id);
        if (! $user) {
            return null;
        }

        $exists = WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)
            ->exists();
        if (! $exists) {
            return null;
        }

        return ['user' => $user, 'external_id' => $id];
    }

    private function upsertIdentity(string $workspaceId, string $userId, ?string $externalId, array $metadata): ScimIdentity
    {
        $identityExternalId = $externalId ?: $userId;

        return ScimIdentity::updateOrCreate(
            [
                'workspace_id' => $workspaceId,
                'user_id' => $userId,
            ],
            [
                'external_id' => $identityExternalId,
                'metadata' => $metadata,
                'last_synced_at' => now(),
            ]
        );
    }

    private function toScimUser(object $user, string $workspaceId, ?string $externalId = null): array
    {
        $identityId = $externalId;
        if (! $identityId) {
            $identityId = ScimIdentity::where('workspace_id', $workspaceId)
                ->where('user_id', $user->id)
                ->value('external_id') ?? $user->id;
        }

        $parts = preg_split('/\s+/', trim((string) ($user->name ?? '')));
        $given = $parts[0] ?? '';
        $family = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';

        $status = WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)
            ->value('status');

        return [
            'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:User'],
            'id' => $identityId,
            'externalId' => $identityId,
            'userName' => $user->email,
            'name' => [
                'givenName' => $given,
                'familyName' => $family,
                'formatted' => trim((string) ($user->name ?? '')),
            ],
            'emails' => [[
                'value' => $user->email,
                'primary' => true,
                'type' => 'work',
            ]],
            'active' => $status !== 'suspended',
            'displayName' => $user->name,
        ];
    }

    private function toScimGroup(EmployeeGroup $group): array
    {
        $group->loadMissing('members.user');

        return [
            'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:Group'],
            'id' => $group->id,
            'displayName' => $group->name,
            'members' => $group->members
                ->filter(fn ($m) => $m->user)
                ->map(fn ($m) => [
                    'value' => $m->user_id,
                    '$ref' => '/Users/'.$m->user_id,
                    'display' => $m->user?->name,
                ])->values(),
        ];
    }

    private function syncGroupMembers(string $workspaceId, EmployeeGroup $group, array $members): void
    {
        $externalIds = collect($members)->pluck('value')->filter()->values()->all();
        if (empty($externalIds)) {
            WorkspaceMember::where('workspace_id', $workspaceId)
                ->where('employee_group_id', $group->id)
                ->update(['employee_group_id' => null, 'updated_at' => now()]);
            return;
        }

        $identityMap = ScimIdentity::where('workspace_id', $workspaceId)
            ->whereIn('external_id', $externalIds)
            ->pluck('user_id', 'external_id');

        $resolvedUserIds = collect($externalIds)
            ->map(function (string $id) use ($identityMap) {
                return $identityMap[$id] ?? $id;
            })
            ->unique()
            ->values()
            ->all();

        DB::transaction(function () use ($workspaceId, $group, $resolvedUserIds) {
            WorkspaceMember::where('workspace_id', $workspaceId)
                ->where('employee_group_id', $group->id)
                ->whereNotIn('user_id', $resolvedUserIds)
                ->update(['employee_group_id' => null, 'updated_at' => now()]);

            WorkspaceMember::where('workspace_id', $workspaceId)
                ->whereIn('user_id', $resolvedUserIds)
                ->update(['employee_group_id' => $group->id, 'updated_at' => now()]);
        });
    }

    private function workspaceId(Request $request): string
    {
        return (string) $request->attributes->get('scim_workspace_id');
    }

    private function scimToken(Request $request): ScimToken
    {
        /** @var ScimToken $token */
        $token = $request->attributes->get('scim_token');

        return $token;
    }

    private function scimResponse(array $payload, int $status = 200): JsonResponse
    {
        return response()
            ->json($payload, $status)
            ->header('Content-Type', 'application/scim+json');
    }

    private function scimError(int $status, string $detail): JsonResponse
    {
        return $this->scimResponse([
            'schemas' => ['urn:ietf:params:scim:api:messages:2.0:Error'],
            'status' => (string) $status,
            'detail' => $detail,
        ], $status);
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
                meta: ['source' => 'scim_v2'],
            );
        } catch (Throwable) {
            // SCIM provisioning must remain available if logging is degraded.
        }
    }
}
