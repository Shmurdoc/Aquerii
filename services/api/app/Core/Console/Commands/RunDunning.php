<?php

namespace App\Core\Console\Commands;

use App\Core\Models\Workspace;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RunDunning extends Command
{
    protected $signature = 'billing:dunning';

    protected $description = 'Handle failed payments: downgrade after 3 days, suspend after 7 days';

    public function handle(): int
    {
        $this->handlePastDue();
        $this->handleSuspension();

        return self::SUCCESS;
    }

    private function handlePastDue(): void
    {
        $threshold = now()->subDays(3);

        $workspaces = Workspace::where('plan_status', 'past_due')
            ->where('plan_expires_at', '<', $threshold)
            ->get();

        foreach ($workspaces as $workspace) {
            DB::transaction(function () use ($workspace) {
                $workspace->update([
                    'plan' => 'free',
                    'plan_status' => 'cancelled',
                    'stripe_subscription_id' => null,
                ]);

                DB::table('billing_events')->insert([
                    'id' => (string) Str::uuid(),
                    'workspace_id' => $workspace->id,
                    'processor' => 'system',
                    'event_type' => 'dunning_downgraded',
                    'payload' => json_encode([
                        'reason' => 'past_due_3_days',
                        'previous_plan' => $workspace->plan,
                    ]),
                    'processed_at' => now(),
                ]);

                Log::info('Dunning: downgraded workspace to free', [
                    'workspace_id' => $workspace->id,
                    'previous_plan' => $workspace->plan,
                ]);
            });

            $this->info("Downgraded workspace {$workspace->id} to free (past due >3 days)");
        }
    }

    private function handleSuspension(): void
    {
        $threshold = now()->subDays(7);

        $workspaces = Workspace::where('plan_status', 'cancelled')
            ->whereNull('suspended_at')
            ->where('plan_expires_at', '<', $threshold)
            ->get();

        foreach ($workspaces as $workspace) {
            DB::transaction(function () use ($workspace) {
                $workspace->update([
                    'plan_status' => 'suspended',
                    'suspended_at' => now(),
                ]);

                DB::table('billing_events')->insert([
                    'id' => (string) Str::uuid(),
                    'workspace_id' => $workspace->id,
                    'processor' => 'system',
                    'event_type' => 'dunning_suspended',
                    'payload' => json_encode([
                        'reason' => 'past_due_7_days',
                    ]),
                    'processed_at' => now(),
                ]);

                Log::warning('Dunning: suspended workspace', [
                    'workspace_id' => $workspace->id,
                ]);
            });

            $this->warn("Suspended workspace {$workspace->id} (past due >7 days)");
        }
    }
}
