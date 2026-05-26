<?php

namespace App\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the current workspace from the JWT claim or request header,
 * then sets the PostgreSQL session variables used by RLS policies:
 *
 *   SET app.current_workspace_id = '{uuid}';
 *   SET app.current_user_id      = '{uuid}';
 *
 * Must run before any Eloquent query on a tenant-scoped table.
 */
class SetWorkspaceTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $workspaceId = $this->resolveWorkspaceId($request);

        if ($workspaceId) {
            // If header-driven, verify the user is actually a member of this workspace
            if ($request->hasHeader('X-Workspace-ID') && $user = $request->user()) {
                $isMember = DB::table('workspace_members')
                    ->where('workspace_id', $workspaceId)
                    ->where('user_id', $user->id)
                    ->exists();
                if (!$isMember) {
                    abort(403, 'Not a member of this workspace.');
                }
            }

            if (DB::getDriverName() === 'pgsql') {
                DB::select("SELECT set_config('app.current_workspace_id', ?, false)", [$workspaceId]);
            }

            $request->attributes->set('workspace_id', $workspaceId);
        }

        if ($user = $request->user()) {
            $userId = $user->id;
            if (DB::getDriverName() === 'pgsql' && $userId) {
                DB::select("SELECT set_config('app.current_user_id', ?, false)", [$userId]);
            }
        }

        return $next($request);
    }

    private function resolveWorkspaceId(Request $request): ?string
    {
        if ($header = $request->header('X-Workspace-ID')) {
            return $this->validateAndReturn($header);
        }

        $routeParam = $request->route('workspace');
        if ($routeParam) {
            if (is_object($routeParam) && isset($routeParam->id)) {
                return $this->validateAndReturn((string) $routeParam->id);
            }
            if (is_string($routeParam)) {
                return $this->validateAndReturn($routeParam);
            }
        }

        if ($sessionId = session('workspace_id')) {
            return $this->validateAndReturn($sessionId);
        }

        return null;
    }

    private function validateAndReturn(string $id): ?string
    {
        if (! preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
            return null;
        }

        return $id;
    }
}
