<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\ContractMilestone;
use App\Modules\CRM\Models\CrmDeal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContractMilestoneController extends Controller
{
    public function index(Request $request, Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        $milestones = ContractMilestone::where('crm_deal_id', $deal->id)
            ->orderBy('due_date')
            ->get();

        return response()->json(['data' => $milestones]);
    }

    public function store(Request $request, Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'amount' => 'sometimes|numeric|min:0',
            'due_date' => 'sometimes|nullable|date',
            'status' => 'sometimes|string|in:pending,in_progress,completed,overdue',
            'notes' => 'sometimes|nullable|string',
        ]);

        $milestone = ContractMilestone::create(array_merge($validated, [
            'workspace_id' => $workspace->id,
            'crm_deal_id' => $deal->id,
        ]));

        return response()->json(['data' => $milestone], 201);
    }

    public function update(Request $request, Workspace $workspace, ContractMilestone $milestone): JsonResponse
    {
        abort_if($milestone->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'amount' => 'sometimes|numeric|min:0',
            'due_date' => 'sometimes|nullable|date',
            'status' => 'sometimes|string|in:pending,in_progress,completed,overdue',
            'notes' => 'sometimes|nullable|string',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'completed') {
            $validated['completed_at'] = now();
        }

        $milestone->update($validated);

        return response()->json(['data' => $milestone]);
    }

    public function destroy(Workspace $workspace, ContractMilestone $milestone): JsonResponse
    {
        abort_if($milestone->workspace_id !== $workspace->id, 404);

        $milestone->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function complete(Request $request, Workspace $workspace, ContractMilestone $milestone): JsonResponse
    {
        abort_if($milestone->workspace_id !== $workspace->id, 404);

        $milestone->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return response()->json(['data' => $milestone]);
    }
}
