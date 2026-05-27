<?php

namespace App\Core\Http\Middleware;

use App\Core\Models\Workspace;
use App\Core\Services\FeatureService;
use Closure;
use Illuminate\Http\Request;

class CheckFeatureAccess
{
    public function __construct(private FeatureService $features) {}

    public function handle(Request $request, Closure $next, string $featureKey)
    {
        $workspace = $request->route('workspace')
            ?? $request->route('workspaceId');

        if (! $workspace instanceof Workspace) {
            $workspace = Workspace::find($workspace);
        }

        if ($workspace) {
            $this->features->assertEnabled($featureKey, $workspace);
        }

        return $next($request);
    }
}
