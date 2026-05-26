<?php

namespace App\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RequireWorkspaceRole
{
    /**
     * Usage in routes: middleware('workspace.role:owner,admin')
     * Passes if the authenticated user has ANY of the listed roles in the current workspace.
     */
    public function handle(Request $request, Closure $next, string ...$roles): mixed
    {
        $workspace = $request->route('workspace');
        $workspaceId = is_object($workspace) ? $workspace->id : $workspace;

        abort_unless($workspaceId, 403, 'No workspace context.');
        abort_unless($request->user(), 401, 'Unauthenticated.');

        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        abort_unless($member, 403, 'Not a member of this workspace.');
        abort_unless(in_array($member->role, $roles), 403, 'Insufficient role for this action.');

        return $next($request);
    }
}
