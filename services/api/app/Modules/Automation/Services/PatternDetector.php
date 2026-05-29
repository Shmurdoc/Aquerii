<?php

namespace App\Modules\Automation\Services;

use App\Core\Models\Item;
use App\Core\Models\Workspace;
use App\Modules\Automation\Models\Automation;
use App\Modules\Automation\Models\AutomationRecommendation;
use App\Modules\Automation\Models\AutomationRun;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PatternDetector
{
    public function detect(string $workspaceId): array
    {
        $recommendations = [];

        // Detect patterns
        $recommendations = array_merge($recommendations, $this->detectFrequentStatusChanges($workspaceId));
        $recommendations = array_merge($recommendations, $this->detectBottleneckTasks($workspaceId));
        $recommendations = array_merge($recommendations, $this->detectUnusedAutomationPotential($workspaceId));
        $recommendations = array_merge($recommendations, $this->detectTimeBasedPatterns($workspaceId));

        // Save recommendations
        foreach ($recommendations as $rec) {
            $this->saveRecommendation($workspaceId, $rec);
        }

        return $recommendations;
    }

    private function detectFrequentStatusChanges(string $workspaceId): array
    {
        $recommendations = [];

        // Find items that change status frequently
        $frequentChangers = Item::where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->where('updated_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('id')
            ->havingRaw('COUNT(*) > 5')
            ->get(['id', 'title', 'board_id']);

        if ($frequentChangers->count() > 0) {
            $recommendations[] = [
                'title' => 'Auto-update status on activity',
                'description' => 'Items change status frequently. Consider automating status transitions based on activity.',
                'category' => 'workflow',
                'priority' => 'medium',
                'pattern_type' => 'frequent_action',
                'evidence' => [
                    'items_affected' => $frequentChangers->count(),
                    'sample_items' => $frequentChangers->pluck('title')->take(3)->toArray(),
                ],
                'trigger_config' => ['type' => 'item.updated'],
                'actions' => [['type' => 'change_status', 'value' => 'in_progress']],
            ];
        }

        return $recommendations;
    }

    private function detectBottleneckTasks(string $workspaceId): array
    {
        $recommendations = [];

        // Find overdue tasks
        $overdueTasks = Item::where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->where('status', '!=', 'done')
            ->where('due_date', '<', Carbon::now())
            ->count();

        if ($overdueTasks > 3) {
            $recommendations[] = [
                'title' => 'Notify on overdue tasks',
                'description' => "{$overdueTasks} tasks are overdue. Set up automatic notifications when tasks pass their deadline.",
                'category' => 'task',
                'priority' => 'high',
                'pattern_type' => 'bottleneck',
                'evidence' => [
                    'overdue_count' => $overdueTasks,
                ],
                'trigger_config' => ['type' => 'status.changed', 'config' => ['to_status' => 'overdue']],
                'actions' => [['type' => 'send_notification', 'body' => 'Task is overdue']],
            ];
        }

        return $recommendations;
    }

    private function detectUnusedAutomationPotential(string $workspaceId): array
    {
        $recommendations = [];

        // Find boards with many items but no automations
        $boardsWithoutAutomations = DB::table('items')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->groupBy('board_id')
            ->havingRaw('COUNT(*) > 10')
            ->pluck('board_id');

        $boardsWithAutomations = Automation::where('workspace_id', $workspaceId)
            ->pluck('board_id')
            ->filter()
            ->toArray();

        $unusedBoards = $boardsWithoutAutomations->reject(fn ($id) => in_array($id, $boardsWithAutomations));

        if ($unusedBoards->count() > 0) {
            $recommendations[] = [
                'title' => 'Add automation to busy boards',
                'description' => "{$unusedBoards->count()} boards have many items but no automations. Automations can save time on repetitive tasks.",
                'category' => 'project',
                'priority' => 'medium',
                'pattern_type' => 'usage_pattern',
                'evidence' => [
                    'boards_without_automations' => $unusedBoards->count(),
                ],
                'trigger_config' => ['type' => 'item.created'],
                'actions' => [['type' => 'send_notification', 'body' => 'New item created']],
            ];
        }

        return $recommendations;
    }

    private function detectTimeBasedPatterns(string $workspaceId): array
    {
        $recommendations = [];

        // Find items created but never updated
        $staleItems = Item::where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->where('status', 'open')
            ->where('created_at', '<', Carbon::now()->subDays(14))
            ->where('updated_at', '<', Carbon::now()->subDays(7))
            ->count();

        if ($staleItems > 5) {
            $recommendations[] = [
                'title' => 'Archive stale items',
                'description' => "{$staleItems} items haven't been updated in 7+ days. Consider auto-archiving or sending reminders.",
                'category' => 'task',
                'priority' => 'low',
                'pattern_type' => 'time_based',
                'evidence' => [
                    'stale_count' => $staleItems,
                ],
                'trigger_config' => ['type' => 'item.updated', 'config' => ['idle_days' => 7]],
                'actions' => [['type' => 'send_notification', 'body' => 'Item has been idle for 7 days']],
            ];
        }

        return $recommendations;
    }

    private function saveRecommendation(string $workspaceId, array $data): void
    {
        // Check if similar recommendation already exists
        $exists = AutomationRecommendation::where('workspace_id', $workspaceId)
            ->where('title', $data['title'])
            ->where('status', 'pending')
            ->exists();

        if (!$exists) {
            AutomationRecommendation::create(array_merge($data, [
                'workspace_id' => $workspaceId,
            ]));
        }
    }
}
