<?php

namespace App\Core\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Exposes the authenticated user's effective permissions, roles, and
 * account type to the frontend so client-side permission gates can
 * be driven by the same source of truth as the server.
 *
 * Endpoint: GET /api/me/permissions
 *
 * Tries Spatie's laravel-permission trait first (the future-proof
 * path) and falls back to a hardcoded account_type-based permission
 * set when the User model hasn't been wired up with the HasRoles
 * trait yet.
 *
 * Response shape:
 *   {
 *     "data": {
 *       "permissions":   string[],   // e.g. ["workspace.*", "boards.*"]
 *       "roles":         string[],   // e.g. ["pos-manager", "pos-executive"]
 *       "account_type":  string      // one of superadmin_creator / platform_admin / subscriber / employee
 *     }
 *   }
 */
class PermissionController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $accountType = (string) ($user->account_type ?? 'employee');

        [$permissions, $roles] = $this->resolvePermissionsAndRoles($user, $accountType);

        return response()->json([
            'data' => [
                'permissions' => array_values(array_unique($permissions)),
                'roles' => array_values(array_unique($roles)),
                'account_type' => $accountType,
            ],
        ]);
    }

    /**
     * @return array{0: string[], 1: string[]}
     */
    private function resolvePermissionsAndRoles(mixed $user, string $accountType): array
    {
        if (method_exists($user, 'getAllPermissions') && method_exists($user, 'roles')) {
            $permissions = $user->getAllPermissions()
                ->pluck('name')
                ->map(fn ($name) => (string) $name)
                ->all();

            $roles = $user->roles
                ->pluck('name')
                ->map(fn ($name) => (string) $name)
                ->all();

            return [$permissions, $roles];
        }

        return [
            $this->fallbackPermissionsFor($accountType),
            $this->fallbackRolesFor($accountType),
        ];
    }

    /**
     * Hardcoded permission sets keyed on account_type. Used until
     * Spatie's HasRoles trait is wired up on the User model.
     *
     * The sets mirror the legacy ROLE_PERMISSIONS map that used to
     * live in services/web/src/hooks/usePermission.ts. They are
     * intentionally broad on purpose — granular workspace-scoped
     * gating is enforced server-side by the workspace.role
     * middleware and the route group guards.
     *
     * @return string[]
     */
    private function fallbackPermissionsFor(string $accountType): array
    {
        $ownerSet = [
            'workspace.*', 'members.*', 'invoices.*', 'sales_orders.*',
            'purchase_orders.*', 'crm.*', 'boards.*', 'files.*',
            'reports.*', 'meetings.*', 'employees.*', 'leave.*',
            'expenses.*', 'settings.*', 'billing.*',
        ];

        $adminSet = array_merge($ownerSet, ['admin.*', 'scim.*', 'webhook-endpoints.*', 'audit-logs.*']);

        return match ($accountType) {
            'superadmin_creator' => ['*.*'],
            'platform_admin' => $adminSet,
            'subscriber' => $ownerSet,
            'employee' => [],
            default => [],
        };
    }

    /**
     * Hardcoded role list keyed on account_type. Used as the roles
     * field in the fallback path.
     *
     * @return string[]
     */
    private function fallbackRolesFor(string $accountType): array
    {
        return match ($accountType) {
            'superadmin_creator' => ['superadmin-creator'],
            'platform_admin' => ['platform-admin'],
            'subscriber' => ['subscriber'],
            'employee' => [],
            default => [],
        };
    }
}
