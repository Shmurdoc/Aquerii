<?php

namespace App\Modules\Automation\Services;

use App\Core\Jobs\SendNotification;
use App\Core\Models\Item;
use App\Modules\Automation\Models\Automation;
use App\Modules\Automation\Models\AutomationRun;
use Illuminate\Support\Facades\Log;

/**
 * Evaluates all active automations for a workspace+trigger combination
 * and executes their actions synchronously within a queued job.
 *
 * Supported trigger_type values:
 *   item.created | item.updated | item.deleted | status.changed | assignee.added
 *
 * Supported action types:
 *   change_status    — update item status
 *   assign_user      — add an assignee (via item_assignees pivot)
 *   send_notification — push an in-app notification to a user
 *   move_item        — move item to a different group
 *   create_item      — create a new item in a specified group
 */
class AutomationEngine
{
    public function __construct(private ItemService $itemService) {}

    public function evaluate(string $workspaceId, Item $item, string $trigger, array $context = []): void
    {
        $automations = Automation::where('workspace_id', $workspaceId)
            ->where(fn ($q) => $q->where('board_id', $item->board_id)->orWhereNull('board_id'))
            ->where('trigger_type', $trigger)
            ->where('is_active', true)
            ->get();

        foreach ($automations as $automation) {
            $this->run($automation, $item, $context);
        }
    }

    private function run(Automation $automation, Item $item, array $context): void
    {
        $run = AutomationRun::create([
            'automation_id' => $automation->id,
            'workspace_id' => $automation->workspace_id,
            'item_id' => $item->id,
            'status' => 'running',
            'started_at' => now(),
        ]);

        try {
            foreach ($automation->actions as $action) {
                $this->executeAction($action, $item, $automation, $context);
            }

            $run->update(['status' => 'completed', 'completed_at' => now()]);
            $automation->increment('run_count');
            $automation->update(['last_run_at' => now()]);
        } catch (\Throwable $e) {
            $run->update([
                'status' => 'failed',
                'completed_at' => now(),
                'error_message' => $e->getMessage(),
            ]);
            Log::error('AutomationEngine action failed', [
                'automation_id' => $automation->id,
                'item_id' => $item->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function executeAction(array $action, Item $item, Automation $automation, array $context): void
    {
        $type = $action['type'] ?? null;

        switch ($type) {
            case 'change_status':
                $this->itemService->update(
                    $item->fresh(),
                    ['status' => $action['value']],
                    null  // automation; no user actor
                );
                break;

            case 'assign_user':
                $userId = $action['user_id'] ?? null;
                if ($userId && ! $item->assignees()->where('users.id', $userId)->exists()) {
                    $item->assignees()->attach($userId, [
                        'assigned_by' => null,  // automation; no user UUID available
                        'assigned_at' => now(),
                    ]);
                    // Notify the assigned user
                    SendNotification::dispatch(
                        $automation->workspace_id,
                        $userId,
                        'item.assigned',
                        'You were assigned to: '.$item->title,
                        null,
                        'item',
                        $item->id
                    );
                }
                break;

            case 'send_notification':
                $userId = $action['user_id'] ?? ($item->created_by ?? null);
                if ($userId) {
                    SendNotification::dispatch(
                        $automation->workspace_id,
                        $userId,
                        'automation.notification',
                        $action['title'] ?? 'Automation triggered',
                        $action['body'] ?? null,
                        'item',
                        $item->id
                    );
                }
                break;

            case 'move_item':
                $groupId = $action['group_id'] ?? null;
                if ($groupId) {
                    $this->itemService->update(
                        $item->fresh(),
                        ['group_id' => $groupId],
                        null  // automation; no user actor
                    );
                }
                break;

            case 'create_item':
                $groupId = $action['group_id'] ?? $item->group_id;
                $this->itemService->create(
                    $item->board,
                    $item->group,
                    [
                        'title' => $action['title'] ?? 'Auto-created item',
                        'group_id' => $groupId,
                        'column_values' => $action['column_values'] ?? [],
                    ],
                    null  // automation; no user actor
                );
                break;

            default:
                Log::warning('AutomationEngine: unknown action type', ['type' => $type, 'automation_id' => $automation->id]);
        }
    }
}
