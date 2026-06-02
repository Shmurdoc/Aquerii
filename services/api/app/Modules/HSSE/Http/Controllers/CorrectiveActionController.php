<?php

namespace App\Modules\HSSE\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\HSSE\Models\CorrectiveAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CorrectiveActionController extends Controller
{
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

        $action = CorrectiveAction::create([
            'workspace_id' => $workspace->id,
            'reference' => $this->nextReference($workspace->id),
            'source_type' => $validated['source_type'],
            'source_id' => $validated['source_id'] ?? null,
            'description' => $validated['description'],
            'assigned_to' => $validated['assigned_to'],
            'priority' => $validated['priority'] ?? CorrectiveAction::PRIORITY_MEDIUM,
            'status' => CorrectiveAction::STATUS_OPEN,
            'due_date' => $validated['due_date'] ?? null,
        ]);

        return response()->json(['data' => $action], 201);
    }

    public function show(Request $request, Workspace $workspace, CorrectiveAction $action): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $action->workspace_id === $workspace->id,
            404
        );

        $action->load(['assignee:id,name', 'verifier:id,name']);

        return response()->json(['data' => $action]);
    }

    public function update(Request $request, Workspace $workspace, CorrectiveAction $action): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $action->workspace_id === $workspace->id,
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

        $statusChanged = isset($validated['status']) && $validated['status'] !== $action->status;

        if ($statusChanged) {
            if ($validated['status'] === CorrectiveAction::STATUS_COMPLETED) {
                $validated['completed_at'] = now();
            }
            if ($validated['status'] === CorrectiveAction::STATUS_VERIFIED) {
                $validated['verified_at'] = now();
                $validated['verified_by'] = $request->user()->id;
            }
        }

        $action->update($validated);

        return response()->json(['data' => $action->fresh()]);
    }

    public function destroy(Request $request, Workspace $workspace, CorrectiveAction $action): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $action->workspace_id === $workspace->id,
            404
        );

        $action->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    private function nextReference(string $workspaceId): string
    {
        $year = now()->format('Y');
        $count = CorrectiveAction::where('workspace_id', $workspaceId)
            ->where('reference', 'like', "CA-{$year}-%")
            ->count();

        return 'CA-'.$year.'-'.str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
    }
}
