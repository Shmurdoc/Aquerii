<?php

namespace App\Http\Controllers\Api;

use App\Core\Models\Goal;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoalController extends Controller
{
    public function index(Request $request, string $workspace): JsonResponse
    {
        $goals = Goal::where('workspace_id', $workspace)
            ->with(['owner:id,name', 'keyResults'])
            ->orderBy('position')
            ->get();

        // Add computed progress
        $goals->each(function ($goal) {
            $goal->progress = $goal->progress;
        });

        return response()->json(['data' => $goals]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'timeframe' => 'nullable|string|max:50',
            'owner_id' => 'nullable|exists:users,id',
            'key_results' => 'nullable|array',
            'key_results.*.title' => 'required|string|max:255',
            'key_results.*.target_value' => 'nullable|numeric|min:0',
            'key_results.*.unit' => 'nullable|string|max:50',
        ]);

        $goal = Goal::create([
            'workspace_id' => $workspace,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'timeframe' => $data['timeframe'] ?? null,
            'owner_id' => $data['owner_id'] ?? $request->user()->id,
            'position' => Goal::where('workspace_id', $workspace)->max('position') + 1,
        ]);

        if (! empty($data['key_results'])) {
            foreach ($data['key_results'] as $kr) {
                $goal->keyResults()->create([
                    'title' => $kr['title'],
                    'target_value' => $kr['target_value'] ?? 100,
                    'unit' => $kr['unit'] ?? '%',
                    'owner_id' => $data['owner_id'] ?? $request->user()->id,
                ]);
            }
        }

        return response()->json(['data' => $goal->load('keyResults')], 201);
    }

    public function show(Request $request, string $workspace, string $goal): JsonResponse
    {
        $goalModel = Goal::where('workspace_id', $workspace)
            ->with(['owner:id,name', 'keyResults.owner:id,name', 'meetingOutcomes'])
            ->findOrFail($goal);

        $goalModel->progress = $goalModel->progress;

        return response()->json(['data' => $goalModel]);
    }

    public function update(Request $request, string $workspace, string $goal): JsonResponse
    {
        $goalModel = Goal::where('workspace_id', $workspace)->findOrFail($goal);

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'timeframe' => 'nullable|string|max:50',
            'status' => 'sometimes|string|in:active,completed,archived',
            'owner_id' => 'nullable|exists:users,id',
        ]);

        $goalModel->update($data);

        return response()->json(['data' => $goalModel->fresh()->load('keyResults')]);
    }

    public function destroy(Request $request, string $workspace, string $goal): JsonResponse
    {
        Goal::where('workspace_id', $workspace)->findOrFail($goal)->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
