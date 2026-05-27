<?php

namespace App\Core\Console\Commands;

use App\Core\Models\Workspace;
use Illuminate\Console\Command;

class PurgeExpiredTrials extends Command
{
    protected $signature = 'app:purge-expired-trials';

    protected $description = 'Downgrade workspaces with expired trials to free plan';

    public function handle(): int
    {
        $count = Workspace::where('plan_status', 'trialing')
            ->where('trial_ends_at', '<', now())
            ->update([
                'plan' => 'free',
                'plan_status' => 'active',
                'trial_ends_at' => null,
            ]);

        $this->info("Downgraded {$count} expired trial workspace(s) to free plan.");

        return self::SUCCESS;
    }
}
