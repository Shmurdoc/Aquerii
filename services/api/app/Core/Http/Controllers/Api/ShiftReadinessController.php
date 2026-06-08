<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\ShiftPlan;
use App\Core\Models\ShiftPlanAssignment;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Services\ShiftReadinessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftReadinessController extends Controller
{
    public function __construct(
        private readonly ShiftReadinessService $readinessService,
    ) {}

    public function readiness(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'shift' => 'required|string|in:morning,night,backshift',
        ]);

        $result = $this->readinessService->getReadiness(
            $workspace->id,
            $validated['date'],
            $validated['shift'],
        );

        return response()->json(['data' => $result]);
    }

    public function plans(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $query = ShiftPlan::where('workspace_id', $workspace->id);

        if (! empty($validated['date_from'])) {
            $query->where('date', '>=', $validated['date_from']);
        }

        if (! empty($validated['date_to'])) {
            $query->where('date', '<=', $validated['date_to']);
        }

        $plans = $query->withCount('assignments')->orderBy('date')->orderBy('shift_type')->get();

        return response()->json(['data' => $plans]);
    }

    public function storePlan(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'shift_type' => 'required|string|in:morning,night,backshift',
            'required_roles' => 'required|array|min:1',
            'required_roles.*.role' => 'required|string|max:100',
            'required_roles.*.count' => 'required|integer|min:1',
            'required_roles.*.required_certs' => 'nullable|array',
            'required_roles.*.required_certs.*' => 'string|max:100',
        ]);

        $plan = ShiftPlan::create(array_merge(
            $validated,
            ['workspace_id' => $workspace->id, 'status' => 'draft'],
        ));

        return response()->json(['data' => $plan], 201);
    }

    public function assign(Request $request, Workspace $workspace, ShiftPlan $plan): JsonResponse
    {
        if ($plan->workspace_id !== $workspace->id) {
            return response()->json(['message' => 'Plan not found in this workspace.'], 404);
        }

        $validated = $request->validate([
            'worker_id' => 'required|string|exists:workspace_members,id',
            'role' => 'required|string|max:100',
        ]);

        $worker = WorkspaceMember::where('workspace_id', $workspace->id)
            ->where('id', $validated['worker_id'])
            ->first();

        if ($worker === null) {
            return response()->json(['message' => 'Worker not found in this workspace.'], 404);
        }

        $assignment = ShiftPlanAssignment::create([
            'workspace_id' => $workspace->id,
            'shift_plan_id' => $plan->id,
            'worker_id' => $worker->id,
            'role' => $validated['role'],
            'status' => 'assigned',
        ]);

        return response()->json(['data' => $assignment], 201);
    }

    public function publish(Request $request, Workspace $workspace, ShiftPlan $plan): JsonResponse
    {
        if ($plan->workspace_id !== $workspace->id) {
            return response()->json(['message' => 'Plan not found in this workspace.'], 404);
        }

        $plan->update(['status' => 'published']);

        return response()->json(['data' => $plan]);
    }

    public function complete(Request $request, Workspace $workspace, ShiftPlan $plan): JsonResponse
    {
        if ($plan->workspace_id !== $workspace->id) {
            return response()->json(['message' => 'Plan not found in this workspace.'], 404);
        }

        $plan->update(['status' => 'completed']);

        return response()->json(['data' => $plan]);
    }
}
