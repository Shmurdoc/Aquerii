<?php

namespace App\Core\Services;

use App\Core\Enums\SubscriptionPlan;
use App\Core\Models\Workspace;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class UsageService
{
    public function get(Workspace $workspace, string $resource): int
    {
        return (int) DB::table('workspace_usage')
            ->where('workspace_id', $workspace->id)
            ->where('resource', $resource)
            ->value('used') ?? 0;
    }

    public function set(Workspace $workspace, string $resource, int $used): void
    {
        DB::table('workspace_usage')->updateOrInsert(
            ['workspace_id' => $workspace->id, 'resource' => $resource],
            ['used' => $used, 'updated_at' => now()],
        );
    }

    public function increment(Workspace $workspace, string $resource, int $amount = 1): void
    {
        DB::table('workspace_usage')->updateOrInsert(
            ['workspace_id' => $workspace->id, 'resource' => $resource],
            ['updated_at' => now()],
        );

        DB::table('workspace_usage')
            ->where('workspace_id', $workspace->id)
            ->where('resource', $resource)
            ->increment('used', $amount);
    }

    public function decrement(Workspace $workspace, string $resource, int $amount = 1): void
    {
        DB::table('workspace_usage')
            ->where('workspace_id', $workspace->id)
            ->where('resource', $resource)
            ->where('used', '>=', $amount)
            ->decrement('used', $amount);
    }

    public function check(Workspace $workspace, string $resource, int $needed = 1): bool
    {
        $plan = SubscriptionPlan::from($workspace->plan ?? 'free');
        $limit = $plan->feature($resource);

        if ($limit === null || $limit === -1) {
            return true;
        }

        $used = $this->get($workspace, $resource);

        return ($used + $needed) <= $limit;
    }

    public function enforce(Workspace $workspace, string $resource, int $needed = 1): void
    {
        if (! $this->check($workspace, $resource, $needed)) {
            $plan = SubscriptionPlan::from($workspace->plan ?? 'free');
            $limit = $plan->feature($resource);

            abort(402, "Resource limit exceeded: {$resource} (used {$this->get($workspace, $resource)}, limit {$limit})");
        }
    }
}
