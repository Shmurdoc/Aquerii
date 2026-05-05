<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Models\CrmPipeline;
use App\Models\CrmPipelineStage;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PipelineController extends Controller
{
    public function index(Workspace $workspace): JsonResponse
    {
        $pipelines = CrmPipeline::where('workspace_id', $workspace->id)
            ->with('stages')
            ->get();

        return response()->json(['data' => $pipelines]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('create', [CrmPipeline::class, $workspace]);

        $validated = $request->validate([
            'name'       => 'required|string|max:100',
            'is_default' => 'sometimes|boolean',
        ]);

        $pipeline = CrmPipeline::create([
            'workspace_id' => $workspace->id,
            'name'         => $validated['name'],
            'is_default'   => $validated['is_default'] ?? false,
        ]);

        $defaultStages = [
            ['name' => 'Lead',         'color' => '#6366f1', 'win_probability' => 10],
            ['name' => 'Qualified',    'color' => '#8b5cf6', 'win_probability' => 25],
            ['name' => 'Proposal',     'color' => '#3b82f6', 'win_probability' => 50],
            ['name' => 'Negotiation',  'color' => '#f59e0b', 'win_probability' => 75],
            ['name' => 'Closed Won',   'color' => '#22c55e', 'win_probability' => 100],
            ['name' => 'Closed Lost',  'color' => '#ef4444', 'win_probability' => 0],
        ];

        foreach ($defaultStages as $i => $stage) {
            CrmPipelineStage::create([
                'pipeline_id'     => $pipeline->id,
                'workspace_id'    => $workspace->id,
                'name'            => $stage['name'],
                'color'           => $stage['color'],
                'position'        => ($i + 1) * 65536,
                'win_probability' => $stage['win_probability'],
            ]);
        }

        return response()->json(['data' => $pipeline->load('stages')], 201);
    }

    public function show(Workspace $workspace, CrmPipeline $pipeline): JsonResponse
    {
        abort_if($pipeline->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $pipeline->load('stages')]);
    }

    public function update(Request $request, Workspace $workspace, CrmPipeline $pipeline): JsonResponse
    {
        abort_if($pipeline->workspace_id !== $workspace->id, 404);
        $this->authorize('update', $pipeline);

        $validated = $request->validate([
            'name'       => 'sometimes|string|max:100',
            'is_default' => 'sometimes|boolean',
        ]);

        $pipeline->update($validated);

        return response()->json(['data' => $pipeline]);
    }

    public function destroy(Workspace $workspace, CrmPipeline $pipeline): JsonResponse
    {
        abort_if($pipeline->workspace_id !== $workspace->id, 404);
        $this->authorize('delete', $pipeline);

        $pipeline->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
