<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Goal;
use App\Core\Models\MeetingOutcome;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeetingOutcomeController extends Controller
{
    public function store(Request $request, string $workspace, string $meeting): JsonResponse
    {
        $data = $request->validate([
            'decisions' => 'nullable|array',
            'decisions.*' => 'string|max:500',
            'action_items' => 'nullable|array',
            'action_items.*.text' => 'required|string|max:500',
            'action_items.*.assignee_id' => 'nullable|exists:users,id',
            'effectiveness_score' => 'nullable|integer|min:1|max:5',
            'notes' => 'nullable|string|max:2000',
            'linked_goal_id' => 'nullable|exists:goals,id',
        ]);

        $outcome = MeetingOutcome::updateOrCreate(
            ['meeting_id' => $meeting],
            [
                'workspace_id' => $workspace,
                'decisions' => $data['decisions'] ?? [],
                'action_items' => $data['action_items'] ?? [],
                'effectiveness_score' => $data['effectiveness_score'] ?? null,
                'notes' => $data['notes'] ?? null,
                'linked_goal_id' => $data['linked_goal_id'] ?? null,
            ]
        );

        // If linked to a goal, auto-update key result progress
        if ($outcome->linked_goal_id && $outcome->effectiveness_score) {
            $this->updateGoalProgress($outcome);
        }

        return response()->json(['data' => $outcome]);
    }

    public function show(Request $request, string $workspace, string $meeting): JsonResponse
    {
        $outcome = MeetingOutcome::where('workspace_id', $workspace)
            ->where('meeting_id', $meeting)
            ->with('linkedGoal')
            ->first();

        return response()->json(['data' => $outcome]);
    }

    public function index(Request $request, string $workspace): JsonResponse
    {
        $outcomes = MeetingOutcome::where('workspace_id', $workspace)
            ->with('meeting:id,title,starts_at')
            ->with('linkedGoal:id,title')
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json(['data' => $outcomes]);
    }

    private function updateGoalProgress(MeetingOutcome $outcome): void
    {
        $goal = Goal::find($outcome->linked_goal_id);
        if (! $goal) {
            return;
        }

        // Find the first key result and increment based on effectiveness
        $kr = $goal->keyResults()->first();
        if (! $kr) {
            return;
        }

        // Simple: effectiveness 1-5 maps to 10-50% progress increment
        $increment = $outcome->effectiveness_score * 10;
        $kr->update([
            'current_value' => min($kr->target_value, $kr->current_value + $increment),
        ]);

        // Auto-complete if target reached
        if ($kr->current_value >= $kr->target_value) {
            $kr->update(['status' => 'completed']);
        }
    }
}
