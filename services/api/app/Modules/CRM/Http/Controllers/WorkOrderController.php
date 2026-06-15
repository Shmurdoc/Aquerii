<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WorkOrderController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = WorkOrder::where('workspace_id', $workspace->id)
            ->with(['deal:id,title', 'assignedWorker:id,name']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($dealId = $request->query('deal_id')) {
            $query->where('crm_deal_id', $dealId);
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(25);

        return response()->json(['data' => $orders]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'crm_deal_id' => 'required|uuid|exists:crm_deals,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'scope_of_work' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'scheduled_start' => 'nullable|date',
            'scheduled_end' => 'nullable|date|after_or_equal:scheduled_start',
            'assigned_worker_id' => 'nullable|uuid|exists:users,id',
            'total_hours_estimated' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $number = 'WO-'.strtoupper(Str::random(8));

        while (WorkOrder::where('workspace_id', $workspace->id)->where('work_order_number', $number)->exists()) {
            $number = 'WO-'.strtoupper(Str::random(8));
        }

        $order = WorkOrder::create(array_merge($validated, [
            'workspace_id' => $workspace->id,
            'work_order_number' => $number,
            'status' => 'draft',
        ]));

        return response()->json(['data' => $order->load(['deal:id,title', 'assignedWorker:id,name'])], 201);
    }

    public function show(Workspace $workspace, WorkOrder $workOrder): JsonResponse
    {
        abort_if($workOrder->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $workOrder->load(['deal:id,title', 'assignedWorker:id,name'])]);
    }

    public function update(Request $request, Workspace $workspace, WorkOrder $workOrder): JsonResponse
    {
        abort_if($workOrder->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'scope_of_work' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'scheduled_start' => 'nullable|date',
            'scheduled_end' => 'nullable|date|after_or_equal:scheduled_start',
            'assigned_worker_id' => 'nullable|uuid|exists:users,id',
            'total_hours_estimated' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:draft,issued,in_progress,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        $workOrder->update($validated);

        return response()->json(['data' => $workOrder->fresh()->load(['deal:id,title', 'assignedWorker:id,name'])]);
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
        abort_if($workOrder->status !== 'draft', 422, 'Only draft work orders can be issued.');

        $workOrder->update(['status' => 'issued']);

        return response()->json(['data' => $workOrder->fresh()->load(['deal:id,title', 'assignedWorker:id,name'])]);
    }

    public function complete(Request $request, Workspace $workspace, WorkOrder $workOrder): JsonResponse
    {
        abort_if($workOrder->workspace_id !== $workspace->id, 404);
        abort_if(! in_array($workOrder->status, ['issued', 'in_progress'], true), 422, 'Work order must be issued or in-progress to complete.');

        $validated = $request->validate([
            'data' => 'nullable|array',
            'data.total_hours_actual' => 'nullable|numeric|min:0',
            'data.notes' => 'nullable|string',
        ]);

        $updateData = [
            'status' => 'completed',
            'actual_end' => now(),
        ];

        if (isset($validated['data']['total_hours_actual'])) {
            $updateData['total_hours_actual'] = $validated['data']['total_hours_actual'];
        }
        if (isset($validated['data']['notes'])) {
            $updateData['notes'] = $validated['data']['notes'];
        }

        $workOrder->update($updateData);

        return response()->json(['data' => $workOrder->fresh()->load(['deal:id,title', 'assignedWorker:id,name'])]);
    }
}
