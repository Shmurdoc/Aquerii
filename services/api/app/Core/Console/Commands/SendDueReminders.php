<?php

namespace App\Core\Console\Commands;

use App\Core\Jobs\SendNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Sends due-date reminder notifications for items whose due_date falls
 * within the next 24 hours. Runs hourly via the scheduler.
 */
class SendDueReminders extends Command
{
    protected $signature = 'app:send-due-reminders';

    protected $description = 'Send in-app notifications for items due in the next 24 hours';

    public function handle(): int
    {
        $now = now();
        $threshold = $now->copy()->addHours(24);

        // Fetch items due within the window that haven't been reminded yet
        $items = DB::table('items')
            ->whereNull('deleted_at')
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$now, $threshold])
            ->whereNull('reminder_sent_at')
            ->limit(500)
            ->get(['id', 'workspace_id', 'title', 'created_by', 'due_date']);

        foreach ($items as $item) {
            // Notify the creator
            if ($item->created_by) {
                SendNotification::dispatch(
                    $item->workspace_id,
                    $item->created_by,
                    'item.due_soon',
                    'Item due soon: '.$item->title,
                    'Due: '.$item->due_date,
                    'item',
                    $item->id
                );
            }

            // Notify all assignees
            $assignees = DB::table('item_assignees')
                ->where('item_id', $item->id)
                ->pluck('user_id');

            foreach ($assignees as $userId) {
                if ($userId === $item->created_by) {
                    continue;
                } // already notified
                SendNotification::dispatch(
                    $item->workspace_id,
                    $userId,
                    'item.due_soon',
                    'Item due soon: '.$item->title,
                    'Due: '.$item->due_date,
                    'item',
                    $item->id
                );
            }

            // Mark as reminded to prevent duplicate notifications
            DB::table('items')
                ->where('id', $item->id)
                ->update(['reminder_sent_at' => now()]);
        }

        $this->info("Sent due reminders for {$items->count()} items.");

        return self::SUCCESS;
    }
}
