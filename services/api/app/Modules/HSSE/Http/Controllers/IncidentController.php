<?php

namespace App\Modules\HSSE\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\HSSE\Models\Incident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncidentController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $query = Incident::where('workspace_id', $workspace->id)
            ->with(['reporter:id,name', 'investigator:id,name']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($severity = $request->query('severity')) {
            $query->where('severity', $severity);
        }
        if ($from = $request->query('from')) {
            $query->where('occurred_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->where('occurred_at', '<=', $to);
        }

        $incidents = $query->orderByDesc('occurred_at')
            ->limit(100)
            ->get();

        return response()->json(['data' => $incidents]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'type' => 'required|string|in:'.implode(',', Incident::$types),
            'severity' => 'required|string|in:'.implode(',', Incident::$severities),
            'occurred_at' => 'required|date',
            'location' => 'nullable|string|max:255',
            'location_details' => 'nullable|array',
            'location_details.lat' => 'nullable|numeric',
            'location_details.lng' => 'nullable|numeric',
            'location_details.area' => 'nullable|string',
            'body_part_affected' => 'nullable|string|max:255',
            'injury_type' => 'nullable|string|max:255',
            'mhsa_classification' => 'nullable|string|in:A,B,C',
            'coida_reportable' => 'sometimes|boolean',
            'coida_reference' => 'nullable|string|max:50',
            'investigator_id' => 'nullable|uuid',
        ]);

        $incident = Incident::create([
            'workspace_id' => $workspace->id,
            'reference' => $this->nextReference($workspace->id),
            'title' => $validated['title'],
            'description' => $validated['description'],
            'type' => $validated['type'],
            'severity' => $validated['severity'],
            'status' => Incident::STATUS_OPEN,
            'occurred_at' => $validated['occurred_at'],
            'reported_at' => now(),
            'location' => $validated['location'] ?? null,
            'location_details' => $validated['location_details'] ?? null,
            'body_part_affected' => $validated['body_part_affected'] ?? null,
            'injury_type' => $validated['injury_type'] ?? null,
            'mhsa_classification' => $validated['mhsa_classification'] ?? null,
            'coida_reportable' => $validated['coida_reportable'] ?? false,
            'coida_reference' => $validated['coida_reference'] ?? null,
            'reporter_id' => $request->user()->id,
            'investigator_id' => $validated['investigator_id'] ?? null,
        ]);

        return response()->json(['data' => $incident], 201);
    }

    public function show(Request $request, Workspace $workspace, Incident $incident): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $incident->workspace_id === $workspace->id,
            404
        );

        $incident->load(['reporter:id,name', 'investigator:id,name', 'correctiveActions']);

        return response()->json(['data' => $incident]);
    }

    public function update(Request $request, Workspace $workspace, Incident $incident): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $incident->workspace_id === $workspace->id,
            404
        );

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'type' => 'sometimes|string|in:'.implode(',', Incident::$types),
            'severity' => 'sometimes|string|in:'.implode(',', Incident::$severities),
            'status' => 'sometimes|string|in:'.implode(',', Incident::$statuses),
            'occurred_at' => 'sometimes|date',
            'location' => 'nullable|string|max:255',
            'location_details' => 'nullable|array',
            'body_part_affected' => 'nullable|string|max:255',
            'injury_type' => 'nullable|string|max:255',
            'mhsa_classification' => 'nullable|string|in:A,B,C',
            'coida_reportable' => 'sometimes|boolean',
            'coida_reference' => 'nullable|string|max:50',
            'investigator_id' => 'nullable|uuid',
            'root_cause' => 'nullable|string',
            'immediate_cause' => 'nullable|string',
            'contributing_factors' => 'nullable|array',
            'contributing_factors.*' => 'string',
        ]);

        if (isset($validated['status']) && $validated['status'] === Incident::STATUS_CLOSED) {
            $validated['closed_at'] = now();
        }

        $incident->update($validated);

        return response()->json(['data' => $incident->fresh()]);
    }

    public function destroy(Request $request, Workspace $workspace, Incident $incident): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $incident->workspace_id === $workspace->id,
            404
        );

        $incident->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    private function nextReference(string $workspaceId): string
    {
        $year = now()->format('Y');
        $count = Incident::where('workspace_id', $workspaceId)
            ->where('reference', 'like', "INC-{$year}-%")
            ->count();

        return 'INC-'.$year.'-'.str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
    }
}
