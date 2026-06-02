<?php

namespace App\Modules\HSSE\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Core\Services\AuditService;
use App\Modules\HSSE\Models\CorrectiveAction;
use App\Modules\HSSE\Services\ReferenceSequenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CorrectiveActionController extends Controller
{
    public function __construct(
        private ReferenceSequenceService $sequences,
        private AuditService $audit,
    ) {}

    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $query = CorrectiveAction::where('workspace_id', $workspace->id)
            ->with(['assignee:id,name', 'verifier:id,name']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($priority = $request->query('priority')) {
            $query->where('priority', $priority);
        }
        if ($sourceType = $request->query('source_type')) {
            $query->where('source_type', $sourceType);
        }
        if ($assignedTo = $request->query('assigned_to')) {
            $query->where('assigned_to', $assignedTo);
        }
        if ($request->boolean('overdue')) {
            $query->where('due_date', '<', now()->toDateString())
                ->whereNotIn('status', [
                    CorrectiveAction::STATUS_COMPLETED,
                    CorrectiveAction::STATUS_VERIFIED,
                    CorrectiveAction::STATUS_CANCELLED,
                ]);
        }

        $actions = $query->orderBy('due_date')
            ->limit(100)
            ->get();

        return response()->json(['data' => $actions]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $validated = $request->validate([
            'source_type' => 'required|string|in:'.implode(',', CorrectiveAction::$sourceTypes),
            'source_id' => 'nullable|uuid',
            'description' => 'required|string',
            'assigned_to' => 'required|uuid',
            'priority' => 'sometimes|string|in:'.implode(',', CorrectiveAction::$priorities),
            'due_date' => 'nullable|date',
        ]);

        $action = DB::transaction(function () use ($workspace, $validated) {
            return CorrectiveAction::create([
                'workspace_id' => $workspace->id,
                'reference' => $this->sequences->next(
                    $workspace->id,
                    ReferenceSequenceService::ENTITY_CORRECTIVE_ACTION
                ),
                'source_type' => $validated['source_type'],
                'source_id' => $validated['source_id'] ?? null,
                'description' => $validated['description'],
                'assigned_to' => $validated['assigned_to'],
                'priority' => $validated['priority'] ?? CorrectiveAction::PRIORITY_MEDIUM,
                'status' => CorrectiveAction::STATUS_OPEN,
                'due_date' => $validated['due_date'] ?? null,
            ]);
        });

        $this->audit->log(
            action: 'hsse.corrective_action.created',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'corrective_action',
            resourceId: $action->id,
            after: ['reference' => $action->reference, 'priority' => $action->priority],
            meta: [
                'source_type' => $action->source_type,
                'assigned_to' => $action->assigned_to,
            ]
        );

        return response()->json(['data' => $action], 201);
    }

    public function show(Request $request, Workspace $workspace, CorrectiveAction $corrective_action): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $corrective_action->workspace_id === $workspace->id,
            404
        );

        $corrective_action->load(['assignee:id,name', 'verifier:id,name']);

        return response()->json(['data' => $corrective_action]);
    }

    public function update(Request $request, Workspace $workspace, CorrectiveAction $corrective_action): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $corrective_action->workspace_id === $workspace->id,
            404
        );

        $validated = $request->validate([
            'description' => 'sometimes|string',
            'assigned_to' => 'sometimes|uuid',
            'priority' => 'sometimes|string|in:'.implode(',', CorrectiveAction::$priorities),
            'status' => 'sometimes|string|in:'.implode(',', CorrectiveAction::$statuses),
            'due_date' => 'nullable|date',
            'completion_evidence' => 'nullable|string',
        ]);

        $before = $corrective_action->only(['status', 'priority', 'assigned_to']);

        $statusChanged = isset($validated['status']) && $validated['status'] !== $corrective_action->status;
        $becameCompleted = $statusChanged && $validated['status'] === CorrectiveAction::STATUS_COMPLETED;
        $becameVerified = $statusChanged && $validated['status'] === CorrectiveAction::STATUS_VERIFIED;

        if ($becameCompleted) {
            $validated['completed_at'] = now();
        }
        if ($becameVerified) {
            $validated['verified_at'] = now();
            $validated['verified_by'] = $request->user()->id;
        }

        $corrective_action->update($validated);
        $corrective_action->refresh();

        $this->audit->log(
            action: match (true) {
                $becameVerified => 'hsse.corrective_action.verified',
                $becameCompleted => 'hsse.corrective_action.completed',
                $statusChanged => 'hsse.corrective_action.status_changed',
                default => 'hsse.corrective_action.updated',
            },
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'corrective_action',
            resourceId: $corrective_action->id,
            before: $before,
            after: $corrective_action->only(array_keys($before)),
            meta: ['reference' => $corrective_action->reference]
        );

        return response()->json(['data' => $corrective_action]);
    }

    public function destroy(Request $request, Workspace $workspace, CorrectiveAction $corrective_action): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $corrective_action->workspace_id === $workspace->id,
            404
        );

        $reference = $corrective_action->reference;
        $corrective_action->delete();

        $this->audit->log(
            action: 'hsse.corrective_action.deleted',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'corrective_action',
            resourceId: $corrective_action->id,
            before: ['reference' => $reference],
        );

        return response()->json(['data' => ['deleted' => true]]);
    }
}
