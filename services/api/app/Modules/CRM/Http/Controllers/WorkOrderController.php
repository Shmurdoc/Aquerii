<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = WorkOrder::where('workspace_id', $workspace->id)
            ->with(['deal', 'assignedWorker']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($dealId = $request->query('deal_id')) {
            $query->where('crm_deal_id', $dealId);
        }
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$this->escapeLike($search)}%")
                    ->orWhere('work_order_number', 'ilike', "%{$this->escapeLike($search)}%");
            });
        }

        $workOrders = $query->orderBy('created_at', 'desc')->paginate(50);

        return response()->json(['data' => $workOrders->items()]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'crm_deal_id' => 'required|uuid|exists:crm_deals,id',
            'title' => 'required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'scope_of_work' => 'sometimes|nullable|string',
            'location' => 'sometimes|nullable|string|max:255',
            'scheduled_start' => 'sometimes|nullable|date',
            'scheduled_end' => 'sometimes|nullable|date',
            'assigned_worker_id' => 'sometimes|nullable|uuid|exists:users,id',
            'total_hours_estimated' => 'sometimes|nullable|numeric|min:0',
            'notes' => 'sometimes|nullable|string',
        ]);

        $workOrder = WorkOrder::create(array_merge($validated, [
            'workspace_id' => $workspace->id,
        ]));

        return response()->json(['data' => $workOrder->load(['deal', 'assignedWorker'])], 201);
    }

    public function show(Workspace $workspace, WorkOrder $workOrder): JsonResponse
    {
        abort_if($workOrder->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $workOrder->load(['deal', 'assignedWorker'])]);
    }

    public function update(Request $request, Workspace $workspace, WorkOrder $workOrder): JsonResponse
    {
        abort_if($workOrder->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'scope_of_work' => 'sometimes|nullable|string',
            'location' => 'sometimes|nullable|string|max:255',
            'scheduled_start' => 'sometimes|nullable|date',
            'scheduled_end' => 'sometimes|nullable|date',
            'assigned_worker_id' => 'sometimes|nullable|uuid|exists:users,id',
            'total_hours_estimated' => 'sometimes|nullable|numeric|min:0',
            'notes' => 'sometimes|nullable|string',
        ]);

        $workOrder->update($validated);

        return response()->json(['data' => $workOrder->load(['deal', 'assignedWorker'])]);
    }

    public function destroy(Workspace $workspace, WorkOrder $workOrder): JsonResponse
    {
        abort_if($workOrder->workspace_id !== $workspace->id, 404);

        $workOrder->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function issue(Workspace $workspace, WorkOrder $workOrder): JsonResponse
    {
        abort_if($workOrder->workspace_id !== $workspace->id, 404);

        $workOrder->update(['status' => 'issued']);

        return response()->json(['data' => $workOrder->load(['deal', 'assignedWorker'])]);
    }

    public function complete(Request $request, Workspace $workspace, WorkOrder $workOrder): JsonResponse
    {
        abort_if($workOrder->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'actual_end' => 'sometimes|nullable|date',
            'total_hours_actual' => 'sometimes|nullable|numeric|min:0',
        ]);

        $workOrder->update(array_merge($validated, [
            'status' => 'completed',
            'actual_end' => $validated['actual_end'] ?? now(),
        ]));

        return response()->json(['data' => $workOrder->load(['deal', 'assignedWorker'])]);
    }
}
