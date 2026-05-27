<?php

namespace App\Core\Console\Commands;

use App\Core\Enums\SubscriptionPlan;
use App\Core\Models\Workspace;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;

class ResetAiCredits extends Command
{
    protected $signature = 'app:reset-ai-credits {--workspace= : Only reset for a specific workspace}';

    protected $description = 'Reset AI credit usage counters for all workspaces at month boundary';

    public function handle(): int
    {
        $query = Workspace::query();
        if ($workspaceId = $this->option('workspace')) {
            $query->where('id', $workspaceId);
        }

        $count = 0;
        $this->output->progressStart($query->count());

        $query->each(function (Workspace $workspace) use (&$count) {
            // Log current usage before reset
            $current = (int) Redis::get("ai_credits:{$workspace->id}") ?? 0;

            // Reset Redis counter
            Redis::del("ai_credits:{$workspace->id}");

            // Reset DB counters
            $plan = SubscriptionPlan::fromWorkspace($workspace);
            $workspace->updateQuietly([
                'ai_credits_used' => 0,
                'ai_credits_quota' => $plan->feature('ai_credits'),
                'ai_credits_reset_at' => now()->endOfMonth(),
            ]);

            if ($current > 0) {
                $this->line("  Workspace {$workspace->id}: reset {$current} used credits");
            }

            $count++;
            $this->output->progressAdvance();
        });

        $this->output->progressFinish();
        $this->info("Reset AI credits for {$count} workspace(s).");

        return self::SUCCESS;
    }
}
