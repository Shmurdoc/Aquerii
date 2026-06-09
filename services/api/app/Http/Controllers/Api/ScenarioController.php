<?php

namespace App\Http\Controllers\Api;

use App\Core\Models\Goal;
use App\Core\Models\Item;
use App\Core\Models\Scenario;
use App\Core\Models\ScenarioAdjustment;
use App\Core\Models\WorkspaceMember;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ScenarioController extends Controller
{
    public function index(Request $request, string $workspace): JsonResponse
    {
        $scenarios = Scenario::where('workspace_id', $workspace)
            ->with(['creator:id,name', 'adjustments'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $scenarios]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_baseline' => 'boolean',
        ]);

        // Capture current project state as snapshot
        $snapshot = $this->captureProjectState($workspace);

        $scenario = Scenario::create([
            'workspace_id' => $workspace,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'is_baseline' => $data['is_baseline'] ?? false,
            'snapshot_data' => $snapshot,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $scenario], 201);
    }

    public function show(Request $request, string $workspace, string $scenario): JsonResponse
    {
        $scenarioModel = Scenario::where('workspace_id', $workspace)
            ->with(['creator:id,name', 'adjustments'])
            ->findOrFail($scenario);

        return response()->json(['data' => $scenarioModel]);
    }

    public function update(Request $request, string $workspace, string $scenario): JsonResponse
    {
        $scenarioModel = Scenario::where('workspace_id', $workspace)->findOrFail($scenario);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'status' => 'sometimes|string|in:draft,active,archived',
        ]);

        $scenarioModel->update($data);

        return response()->json(['data' => $scenarioModel->fresh()]);
    }

    public function destroy(Request $request, string $workspace, string $scenario): JsonResponse
    {
        Scenario::where('workspace_id', $workspace)->findOrFail($scenario)->delete();

        return response()->json(['message' => 'Deleted']);
    }

    public function addAdjustment(Request $request, string $workspace, string $scenario): JsonResponse
    {
        $scenarioModel = Scenario::where('workspace_id', $workspace)->findOrFail($scenario);

        $data = $request->validate([
            'adjustment_type' => 'required|string|in:add_delay,add_resource,remove_task,change_scope,change_deadline',
            'parameters' => 'required|array',
            'description' => 'nullable|string|max:500',
        ]);

        $adjustment = $scenarioModel->adjustments()->create([
            'adjustment_type' => $data['adjustment_type'],
            'parameters' => $data['parameters'],
            'description' => $data['description'] ?? null,
            'position' => ((int) $scenarioModel->adjustments()->max('position')) + 1,
        ]);

        // Re-run simulation after adding adjustment
        $this->runSimulation($scenarioModel);

        return response()->json(['data' => $adjustment], 201);
    }

    public function removeAdjustment(Request $request, string $workspace, string $scenario, string $adjustment): JsonResponse
    {
        $scenarioModel = Scenario::where('workspace_id', $workspace)->findOrFail($scenario);

        $scenarioModel->adjustments()->where('id', $adjustment)->delete();

        // Re-run simulation after removing adjustment
        $this->runSimulation($scenarioModel);

        return response()->json(['message' => 'Deleted']);
    }

    public function simulate(Request $request, string $workspace, string $scenario): JsonResponse
    {
        $scenarioModel = Scenario::where('workspace_id', $workspace)
            ->with('adjustments')
            ->findOrFail($scenario);

        $this->runSimulation($scenarioModel);

        return response()->json(['data' => $scenarioModel->fresh()]);
    }

    public function compare(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'scenario_ids' => 'required|array|min:2|max:4',
            'scenario_ids.*' => 'exists:scenarios,id',
        ]);

        $scenarios = Scenario::where('workspace_id', $workspace)
            ->whereIn('id', $data['scenario_ids'])
            ->with('adjustments')
            ->get();

        abort_if($scenarios->count() !== count($data['scenario_ids']), 404, 'One or more scenarios were not found in this workspace.');

        // Ensure simulation results are present and up to date for each scenario.
        foreach ($scenarios as $scenario) {
            $this->runSimulation($scenario);
        }

        return response()->json(['data' => $scenarios->map->fresh()]);
    }

    private function captureProjectState(string $workspace): array
    {
        // Capture current tasks
        $tasks = Item::where('workspace_id', $workspace)
            ->whereNull('deleted_at')
            ->select('id', 'title', 'status', 'priority', 'due_date', 'estimated_hours', 'tracked_hours')
            ->get();

        // Capture team capacity
        $members = WorkspaceMember::where('workspace_id', $workspace)
            ->where('status', 'active')
            ->select('user_id', 'weekly_capacity_hours')
            ->get();

        // Capture OKR progress
        $goals = Goal::where('workspace_id', $workspace)
            ->with('keyResults')
            ->get()
            ->map(fn ($goal) => [
                'id' => $goal->id,
                'title' => $goal->title,
                'progress' => $goal->progress,
                'key_results' => $goal->keyResults->map(fn ($kr) => [
                    'id' => $kr->id,
                    'title' => $kr->title,
                    'target' => $kr->target_value,
                    'current' => $kr->current_value,
                ]),
            ]);

        return [
            'tasks' => $tasks,
            'team_capacity' => $members,
            'goals' => $goals,
            'captured_at' => now()->toISOString(),
        ];
    }

    private function runSimulation(Scenario $scenario): void
    {
        $snapshot = $scenario->snapshot_data;
        $adjustments = $scenario->adjustments()->orderBy('position')->get();

        $inputHash = hash('sha256', json_encode([
            'snapshot' => $snapshot,
            'adjustments' => $adjustments->map(fn (ScenarioAdjustment $adj) => [
                'id' => $adj->id,
                'type' => $adj->adjustment_type,
                'parameters' => $adj->parameters,
                'position' => $adj->position,
            ])->values()->all(),
        ]));

        $existingHash = data_get($scenario->simulation_results, 'meta.input_hash');
        if (! empty($scenario->simulation_results) && $existingHash === $inputHash) {
            return;
        }

        // Start with baseline snapshot
        $tasks = collect($snapshot['tasks'] ?? [])
            ->map(function ($task) {
                $task['estimated_hours'] = (float) ($task['estimated_hours'] ?? 0);
                $task['tracked_hours'] = (float) ($task['tracked_hours'] ?? 0);

                return $task;
            });
        $teamCapacity = collect($snapshot['team_capacity'] ?? [])
            ->map(function ($member) {
                $member['weekly_capacity_hours'] = (float) ($member['weekly_capacity_hours'] ?? 0);

                return $member;
            });

        // Guardrail for overly large sync simulation payloads.
        abort_if($tasks->count() > 5000, 422, 'Scenario has too many tasks for synchronous simulation.');

        // Apply adjustments
        foreach ($adjustments as $adj) {
            $this->applyAdjustment($adj, $tasks, $teamCapacity);
        }

        // Calculate projected outcomes
        $totalEstimatedHours = $tasks->sum('estimated_hours');
        $totalCapacityHours = $teamCapacity->sum('weekly_capacity_hours');
        $overdueTasks = $tasks->filter(function ($t) {
            if (($t['status'] ?? null) === 'done') {
                return false;
            }

            $dueDate = $t['due_date'] ?? null;
            if (! $dueDate) {
                return false;
            }

            try {
                return Carbon::parse($dueDate)->isPast();
            } catch (\Throwable) {
                return false;
            }
        })->count();
        $pendingTasks = $tasks->filter(fn ($t) => $t['status'] !== 'done')->count();

        // Project timeline
        $weeklyVelocity = $tasks->where('status', 'done')->count() / max(1, 4); // assume 4 weeks history
        $weeksNeeded = $pendingTasks / max(1, $weeklyVelocity);
        $projectedCompletion = now()->addWeeks($weeksNeeded);

        // Workload per person
        $avgLoadPerPerson = $pendingTasks > 0 && $teamCapacity->count() > 0
            ? $totalEstimatedHours / $teamCapacity->count()
            : 0;

        $results = [
            'total_tasks' => $tasks->count(),
            'pending_tasks' => $pendingTasks,
            'overdue_tasks' => $overdueTasks,
            'total_estimated_hours' => round($totalEstimatedHours, 1),
            'total_capacity_hours' => round($totalCapacityHours, 1),
            'avg_load_per_person' => round($avgLoadPerPerson, 1),
            'weekly_velocity' => round($weeklyVelocity, 1),
            'weeks_needed' => round($weeksNeeded, 1),
            'projected_completion' => $projectedCompletion->toISOString(),
            'risk_score' => min(100, round(($overdueTasks / max(1, $tasks->count())) * 100 + ($avgLoadPerPerson > 40 ? 20 : 0))),
            'simulated_at' => now()->toISOString(),
            'meta' => [
                'engine_version' => 2,
                'input_hash' => $inputHash,
                'task_count' => $tasks->count(),
                'adjustment_count' => $adjustments->count(),
            ],
        ];

        $scenario->update(['simulation_results' => $results]);
    }

    private function applyAdjustment(ScenarioAdjustment $adj, Collection &$tasks, Collection &$teamCapacity): void
    {
        $params = $adj->parameters;

        switch ($adj->adjustment_type) {
            case 'add_delay':
                // Add delay to a specific task
                if (! empty($params['task_id'])) {
                    $taskIndex = $tasks->search(fn ($t) => $t['id'] === $params['task_id']);
                    if ($taskIndex !== false) {
                        $task = $tasks[$taskIndex];
                        if (! empty($task['due_date'])) {
                            $task['due_date'] = Carbon::parse($task['due_date'])
                                ->addDays((int) ($params['days'] ?? 3))
                                ->toDateString();
                        }
                        $tasks[$taskIndex] = $task;
                    }
                }
                break;

            case 'add_resource':
                // Add capacity to team
                $teamCapacity->push([
                    'user_id' => $params['user_id'] ?? 'simulated',
                    'weekly_capacity_hours' => $params['hours_per_week'] ?? 40,
                ]);
                break;

            case 'remove_task':
                // Remove a task from scope
                if (! empty($params['task_id'])) {
                    $tasks = $tasks->filter(fn ($t) => $t['id'] !== $params['task_id']);
                }
                break;

            case 'change_scope':
                // Add or remove hours from total estimate
                $changeHours = $params['hours_change'] ?? 0;
                $tasks = $tasks->map(function ($t) use ($changeHours, $params) {
                    if (! empty($params['task_id']) && $t['id'] === $params['task_id']) {
                        $t['estimated_hours'] = max(0, (float) ($t['estimated_hours'] ?? 0) + (float) $changeHours);
                    }

                    return $t;
                });
                break;

            case 'change_deadline':
                // Change deadline for a specific task or all tasks
                if (! empty($params['task_id'])) {
                    $taskIndex = $tasks->search(fn ($t) => $t['id'] === $params['task_id']);
                    if ($taskIndex !== false) {
                        $task = $tasks[$taskIndex];
                        $task['due_date'] = $params['new_date'];
                        $tasks[$taskIndex] = $task;
                    }
                } elseif (! empty($params['days_change'])) {
                    $tasks = $tasks->map(function ($t) use ($params) {
                        if ($t['due_date']) {
                            $t['due_date'] = Carbon::parse($t['due_date'])
                                ->addDays((int) $params['days_change'])
                                ->toDateString();
                        }

                        return $t;
                    });
                }
                break;
        }
    }
}
