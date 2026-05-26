<?php

namespace App\Jobs;

use App\Models\Automation;
use App\Models\AutomationRun;
use App\Models\Item;
use App\Models\BoardGroup;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class EvaluateAutomationTriggers implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly string $itemId,
        public readonly string $eventType,
    ) {}

    public function handle(): void
    {
        $item = Item::find($this->itemId);
        if (! $item) return;

        $automations = Automation::where('workspace_id', $item->workspace_id)
            ->where('board_id', $item->board_id)
            ->where('trigger_type', $this->eventType)
            ->where('is_active', true)
            ->get();

        foreach ($automations as $automation) {
            $run = AutomationRun::create([
                'automation_id'        => $automation->id,
                'workspace_id'         => $automation->workspace_id,
                'triggered_by_item_id' => $item->id,
                'status'               => 'running',
                'started_at'           => now(),
            ]);

            try {
                $this->executeActions($automation->actions ?? [], $item, $automation->workspace_id);

                $run->update(['status' => 'completed', 'completed_at' => now()]);
                $automation->increment('run_count');
                $automation->update(['last_run_at' => now()]);
            } catch (Throwable $e) {
                Log::error('Automation action failed', [
                    'automation_id' => $automation->id,
                    'item_id'       => $item->id,
                    'error'         => $e->getMessage(),
                ]);
                $run->update([
                    'status'       => 'failed',
                    'completed_at' => now(),
                    'error'        => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Execute all actions for one automation against the triggering item.
     *
     * Supported action types:
     *   change_status   — config: { status: string }
     *   change_priority — config: { priority: string }
     *   assign_user     — config: { user_id: string }
     *   unassign_user   — config: { user_id: string }
     *   move_item       — config: { group_id: string }
     *   create_item     — config: { title: string, group_id: string }
     *   notify          — config: { message: string } (logs; real notify via SendNotification)
     */
    private function executeActions(array $actions, Item $item, string $workspaceId): void
    {
        foreach ($actions as $action) {
            $type   = $action['type'] ?? '';
            $config = $action['config'] ?? [];

            match ($type) {
                'change_status' => $item->update(['status' => $config['status']]),

                'change_priority' => $item->update(['priority' => $config['priority']]),

                'assign_user' => DB::table('item_assignees')
                    ->insertOrIgnore([
                        'item_id'     => $item->id,
                        'user_id'     => $config['user_id'],
                        'assigned_by' => null,
                        'assigned_at' => now(),
                    ]),

                'unassign_user' => DB::table('item_assignees')
                    ->where('item_id', $item->id)
                    ->where('user_id', $config['user_id'])
                    ->delete(),

                'move_item' => $item->update(['group_id' => $config['group_id']]),

                'create_item' => $this->createItem($config, $item, $workspaceId),

                'notify' => Log::info('Automation notify', [
                    'item_id' => $item->id,
                    'message' => $config['message'] ?? '',
                ]),

                default => Log::warning('Unknown automation action type', ['type' => $type]),
            };
        }
    }

    private function createItem(array $config, Item $source, string $workspaceId): void
    {
        $groupId = $config['group_id'] ?? $source->group_id;

        DB::table('items')->insert([
            'id'           => Str::uuid()->toString(),
            'workspace_id' => $workspaceId,
            'board_id'     => $source->board_id,
            'group_id'     => $groupId,
            'title'        => $config['title'] ?? 'New item (automation)',
            'status'       => 'pending',
            'position'     => (DB::table('items')->where('group_id', $groupId)->max('position') ?? 0) + 65536,
            'created_by'   => null,
            'version'      => 1,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }
}
