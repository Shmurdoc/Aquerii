<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the current workspace from the JWT claim or request header,
 * then sets the PostgreSQL session variable used by RLS policies.
 *
 *   SET app.workspace_id = '{uuid}';
 *
 * Must run before any Eloquent query on a tenant-scoped table.
 */
class SetWorkspaceTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $workspaceId = $this->resolveWorkspaceId($request);

        if ($workspaceId) {
            // Validate UUID format to prevent SQL injection
            if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $workspaceId)) {
                return response()->json([
                    'error' => [
                        'code'    => 'INVALID_WORKSPACE',
                        'message' => 'Invalid workspace identifier.',
                    ],
                ], 400);
            }

            // Only set PostgreSQL session variable when using a pgsql connection
            if (\Illuminate\Support\Facades\DB::getDriverName() === 'pgsql') {
                // PostgreSQL SET does not support parameter binding; UUID is pre-validated above.
                \Illuminate\Support\Facades\DB::statement("SET app.workspace_id = '{$workspaceId}'");
            }

            $request->attributes->set('workspace_id', $workspaceId);
        }

        return $next($request);
    }

    private function resolveWorkspaceId(Request $request): ?string
    {
        // 1. From authenticated JWT claim (set by Sanctum/JWT after token decode)
        if ($user = $request->user()) {
            $workspaceId = $request->header('X-Workspace-ID')
                ?? $request->route('workspace')
                ?? session('workspace_id');

            if ($workspaceId) {
                return $workspaceId;
            }
        }

        // 2. From route parameter (e.g. /api/workspaces/{workspace}/boards)
        if ($request->route('workspace')) {
            return $request->route('workspace');
        }

        return null;
    }
}
