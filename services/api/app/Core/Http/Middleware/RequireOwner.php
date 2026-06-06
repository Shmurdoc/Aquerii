<?php

namespace App\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts access to workspace OWNERS only. Use for actions that must
 * never be delegated to admins — outbound webhooks, PATs, billing
 * destruction, etc.
 *
 * Usage in routes: ->middleware('workspace.owner')
 */
class RequireOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        $workspace = $request->route('workspace');
        $workspaceId = is_object($workspace) ? $workspace->id : $workspace;

        abort_unless($workspaceId, 403, 'No workspace context.');
        abort_unless($request->user(), 401, 'Unauthenticated.');

        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first(['role']);

        abort_unless($member, 403, 'Not a member of this workspace.');
        abort_unless($member->role === 'owner', 403, 'Workspace owner role required for this action.');

        return $next($request);
    }
}
