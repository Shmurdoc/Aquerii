<?php

namespace App\Modules\HSSE\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\HSSE\Models\Hazard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HazardController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $query = Hazard::where('workspace_id', $workspace->id)
            ->with(['owner:id,name', 'reviewer:id,name']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }
        if ($level = $request->query('risk_level')) {
            $query->where('risk_level', $level);
        }

        $hazards = $query->orderByDesc('risk_score')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json(['data' => $hazards]);
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
            'category' => 'required|string|in:'.implode(',', Hazard::$categories),
            'location' => 'nullable|string|max:255',
            'source' => 'nullable|string',
            'potential_consequence' => 'nullable|string',
            'likelihood' => 'required|integer|min:1|max:5',
            'severity' => 'required|integer|min:1|max:5',
            'control_measures' => 'nullable|array',
            'control_measures.*' => 'string',
            'residual_likelihood' => 'nullable|integer|min:1|max:5',
            'residual_severity' => 'nullable|integer|min:1|max:5',
            'status' => 'sometimes|string|in:'.implode(',', Hazard::$statuses),
            'reviewer_id' => 'nullable|uuid',
            'next_review_date' => 'nullable|date',
        ]);

        $score = $validated['likelihood'] * $validated['severity'];
        $level = Hazard::computeRiskLevel($score);

        $residualScore = null;
        $residualLevel = null;
        if (isset($validated['residual_likelihood'], $validated['residual_severity'])) {
            $residualScore = $validated['residual_likelihood'] * $validated['residual_severity'];
            $residualLevel = Hazard::computeRiskLevel($residualScore);
        }

        $hazard = Hazard::create([
            'workspace_id' => $workspace->id,
            'reference' => $this->nextReference($workspace->id),
            'title' => $validated['title'],
            'description' => $validated['description'],
            'category' => $validated['category'],
            'location' => $validated['location'] ?? null,
            'source' => $validated['source'] ?? null,
            'potential_consequence' => $validated['potential_consequence'] ?? null,
            'likelihood' => $validated['likelihood'],
            'severity' => $validated['severity'],
            'risk_score' => $score,
            'risk_level' => $level,
            'control_measures' => $validated['control_measures'] ?? null,
            'residual_likelihood' => $validated['residual_likelihood'] ?? null,
            'residual_severity' => $validated['residual_severity'] ?? null,
            'residual_risk_score' => $residualScore,
            'residual_risk_level' => $residualLevel,
            'status' => $validated['status'] ?? Hazard::STATUS_IDENTIFIED,
            'owner_id' => $request->user()->id,
            'reviewer_id' => $validated['reviewer_id'] ?? null,
            'next_review_date' => $validated['next_review_date'] ?? null,
        ]);

        return response()->json(['data' => $hazard], 201);
    }

    public function show(Request $request, Workspace $workspace, Hazard $hazard): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $hazard->workspace_id === $workspace->id,
            404
        );

        $hazard->load(['owner:id,name', 'reviewer:id,name']);

        return response()->json(['data' => $hazard]);
    }

    public function update(Request $request, Workspace $workspace, Hazard $hazard): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $hazard->workspace_id === $workspace->id,
            404
        );

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'category' => 'sometimes|string|in:'.implode(',', Hazard::$categories),
            'location' => 'nullable|string|max:255',
            'source' => 'nullable|string',
            'potential_consequence' => 'nullable|string',
            'likelihood' => 'sometimes|integer|min:1|max:5',
            'severity' => 'sometimes|integer|min:1|max:5',
            'control_measures' => 'nullable|array',
            'control_measures.*' => 'string',
            'residual_likelihood' => 'nullable|integer|min:1|max:5',
            'residual_severity' => 'nullable|integer|min:1|max:5',
            'status' => 'sometimes|string|in:'.implode(',', Hazard::$statuses),
            'reviewer_id' => 'nullable|uuid',
            'next_review_date' => 'nullable|date',
        ]);

        if (isset($validated['likelihood']) || isset($validated['severity'])) {
            $likelihood = $validated['likelihood'] ?? $hazard->likelihood;
            $severity = $validated['severity'] ?? $hazard->severity;
            $validated['risk_score'] = $likelihood * $severity;
            $validated['risk_level'] = Hazard::computeRiskLevel($validated['risk_score']);
        }

        if (isset($validated['residual_likelihood'], $validated['residual_severity'])) {
            $validated['residual_risk_score'] = $validated['residual_likelihood'] * $validated['residual_severity'];
            $validated['residual_risk_level'] = Hazard::computeRiskLevel($validated['residual_risk_score']);
        }

        $hazard->update($validated);

        return response()->json(['data' => $hazard->fresh()]);
    }

    public function destroy(Request $request, Workspace $workspace, Hazard $hazard): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $hazard->workspace_id === $workspace->id,
            404
        );

        $hazard->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    private function nextReference(string $workspaceId): string
    {
        $year = now()->format('Y');
        $count = Hazard::where('workspace_id', $workspaceId)
            ->where('reference', 'like', "HAZ-{$year}-%")
            ->count();

        return 'HAZ-'.$year.'-'.str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
    }
}
