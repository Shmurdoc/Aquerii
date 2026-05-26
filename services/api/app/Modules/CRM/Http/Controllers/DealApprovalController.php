<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmApprovalRule;
use App\Modules\CRM\Models\CrmDealApproval;
use App\Modules\CRM\Services\DealApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DealApprovalController extends Controller
{
    public function __construct(
        protected DealApprovalService $approvalService,
    ) {}

    public function rules(Request $request, Workspace $workspace): JsonResponse
    {
        $rules = CrmApprovalRule::where('workspace_id', $workspace->id)
            ->with('creator:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json(['data' => $rules]);
    }

    public function storeRule(Request $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'threshold_min' => 'nullable|numeric|min:0',
            'threshold_max' => 'nullable|numeric|min:0',
            'approval_chain' => 'sometimes|string|in:single,sequential',
            'approvers' => 'required|array',
            'approvers.*.user_id' => 'required|uuid|exists:users,id',
            'approvers.*.order' => 'sometimes|integer',
            'escalation_hours' => 'nullable|integer|min:1',
            'escalation_user_id' => 'nullable|uuid|exists:users,id',
        ]);

        $data['workspace_id'] = $workspace->id;
        $data['created_by'] = $request->user()->id;

        $rule = CrmApprovalRule::create($data);

        return response()->json(['data' => $rule], 201);
    }

    public function updateRule(Request $request, Workspace $workspace, CrmApprovalRule $rule): JsonResponse
    {
        abort_if($rule->workspace_id !== $workspace->id, 404);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'threshold_min' => 'nullable|numeric|min:0',
            'threshold_max' => 'nullable|numeric|min:0',
            'approval_chain' => 'sometimes|string|in:single,sequential',
            'approvers' => 'sometimes|array',
            'approvers.*.user_id' => 'required_with:approvers|uuid|exists:users,id',
            'escalation_hours' => 'nullable|integer|min:1',
            'escalation_user_id' => 'nullable|uuid|exists:users,id',
            'is_active' => 'boolean',
        ]);

        $rule->update($data);

        return response()->json(['data' => $rule->fresh()]);
    }

    public function destroyRule(Workspace $workspace, CrmApprovalRule $rule): JsonResponse
    {
        abort_if($rule->workspace_id !== $workspace->id, 404);
        $rule->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }

    public function approvals(Workspace $workspace): JsonResponse
    {
        $approvals = CrmDealApproval::where('workspace_id', $workspace->id)
            ->with(['deal:id,title,value', 'currentApprover:id,name'])
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json(['data' => $approvals]);
    }

    public function approve(Request $request, Workspace $workspace, CrmDealApproval $approval): JsonResponse
    {
        abort_if($approval->workspace_id !== $workspace->id, 404);

        $data = $request->validate(['note' => 'nullable|string']);
        $this->approvalService->approve($approval, $request->user()->id, $data['note'] ?? null);

        return response()->json(['data' => $approval->fresh()]);
    }

    public function reject(Request $request, Workspace $workspace, CrmDealApproval $approval): JsonResponse
    {
        abort_if($approval->workspace_id !== $workspace->id, 404);

        $data = $request->validate(['note' => 'nullable|string']);
        $this->approvalService->reject($approval, $request->user()->id, $data['note'] ?? null);

        return response()->json(['data' => $approval->fresh()]);
    }
}
