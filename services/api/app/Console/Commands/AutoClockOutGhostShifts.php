<?php

namespace App\Console\Commands;

use App\Core\Models\AttendanceLog;
use App\Services\AlertService;
use Illuminate\Console\Command;

class AutoClockOutGhostShifts extends Command
{
    protected $signature = 'attendance:auto-clockout-ghosts';
    protected $description = 'Auto-clock-out attendance logs where worker has not clocked out within 18 hours';

    public function handle(AlertService $alerts): int
    {
        $cutoff = now()->subHours(18);

        $ghosts = AttendanceLog::whereNull('clocked_out_at')
            ->where('clocked_in_at', '<', $cutoff)
            ->with('user')
            ->get();

        if ($ghosts->isEmpty()) {
            $this->info('No ghost shifts found.');
            return Command::SUCCESS;
        }

        $count = 0;
        foreach ($ghosts as $log) {
            $log->update([
                'clocked_out_at' => $log->clocked_in_at->copy()->addHours(18),
                'clock_out_source' => 'system_forced',
            ]);

            $alerts->create(
                workspaceId: $log->workspace_id,
                userId: $log->user_id,
                type: 'attendance',
                severity: 'warning',
                title: 'Shift auto-clocked out (18h timeout)',
                message: "{$log->user?->name} was clocked in since {$log->clocked_in_at} without clocking out. Auto-clocked out after 18 hours.",
            );

            $count++;
        }

        $this->info("Auto-clock-out completed for {$count} ghost shift(s).");
        return Command::SUCCESS;
    }
}
