<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PipelineController extends Controller
{
    // GET /workspaces/{workspace}/crm/pipelines
    public function index(Workspace $workspace): JsonResponse
    {
        $pipelines = DB::table('crm_pipelines')
            ->where('workspace_id', $workspace->id)
            ->orderBy('position')
            ->get();

        foreach ($pipelines as $pipeline) {
            $pipeline->stages = DB::table('crm_stages')
                ->where('pipeline_id', $pipeline->id)
                ->orderBy('position')
                ->get();
        }

        return response()->json(['data' => $pipelines]);
    }

    // POST /workspaces/{workspace}/crm/pipelines
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate(['name' => 'required|string|max:100']);

        $maxPos = DB::table('crm_pipelines')->where('workspace_id', $workspace->id)->max('position') ?? 0;
        $id     = Str::uuid()->toString();

        DB::transaction(function () use ($id, $workspace, $validated, $maxPos) {
            DB::table('crm_pipelines')->insert([
                'id'           => $id,
                'workspace_id' => $workspace->id,
                'name'         => $validated['name'],
                'position'     => $maxPos + 65536,
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            // Default stages
            $stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
            $colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#f59e0b', '#22c55e', '#ef4444'];
            foreach ($stages as $i => $name) {
                DB::table('crm_stages')->insert([
                    'id'          => Str::uuid(),
                    'pipeline_id' => $id,
                    'name'        => $name,
                    'color'       => $colors[$i],
                    'position'    => ($i + 1) * 65536,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }
        });

        return response()->json(['data' => ['id' => $id]], 201);
    }
}

class DealController extends Controller
{
    // GET /workspaces/{workspace}/crm/deals
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = DB::table('crm_deals')
            ->where('workspace_id', $workspace->id);

        if ($pipelineId = $request->query('pipeline_id')) {
            $query->where('pipeline_id', $pipelineId);
        }
        if ($stageId = $request->query('stage_id')) {
            $query->where('stage_id', $stageId);
        }

        $deals = $query->orderBy('position')->get();

        return response()->json(['data' => $deals]);
    }

    // POST /workspaces/{workspace}/crm/deals
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'pipeline_id' => 'required|uuid',
            'stage_id'    => 'required|uuid',
            'title'       => 'sometimes|string|max:255',
            'value'       => 'sometimes|nullable|numeric',
            'currency'    => 'sometimes|string|size:3',
            'contact_id'  => 'sometimes|nullable|uuid',
        ]);

        $maxPos = DB::table('crm_deals')
            ->where('stage_id', $validated['stage_id'])
            ->max('position') ?? 0;

        $id = Str::uuid()->toString();
        DB::table('crm_deals')->insert([
            'id'           => $id,
            'workspace_id' => $workspace->id,
            'pipeline_id'  => $validated['pipeline_id'],
            'stage_id'     => $validated['stage_id'],
            'title'        => $validated['title'] ?? 'New Deal',
            'value'        => $validated['value'] ?? null,
            'currency'     => $validated['currency'] ?? 'USD',
            'contact_id'   => $validated['contact_id'] ?? null,
            'position'     => $maxPos + 65536,
            'created_by'   => $request->user()->id,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return response()->json(['data' => ['id' => $id]], 201);
    }

    // PATCH /workspaces/{workspace}/crm/deals/{deal}
    public function update(Request $request, Workspace $workspace, string $dealId): JsonResponse
    {
        $validated = $request->validate([
            'title'      => 'sometimes|string|max:255',
            'stage_id'   => 'sometimes|uuid',
            'value'      => 'sometimes|nullable|numeric',
            'currency'   => 'sometimes|string|size:3',
            'close_date' => 'sometimes|nullable|date',
            'contact_id' => 'sometimes|nullable|uuid',
            'position'   => 'sometimes|numeric',
            'ai_score'   => 'sometimes|nullable|integer|min:0|max:100',
        ]);

        $validated['updated_at'] = now();

        DB::table('crm_deals')
            ->where('id', $dealId)
            ->where('workspace_id', $workspace->id)
            ->update($validated);

        return response()->json(['data' => ['updated' => true]]);
    }

    // DELETE /workspaces/{workspace}/crm/deals/{deal}
    public function destroy(Workspace $workspace, string $dealId): JsonResponse
    {
        DB::table('crm_deals')
            ->where('id', $dealId)
            ->where('workspace_id', $workspace->id)
            ->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}

class ContactController extends Controller
{
    // GET /workspaces/{workspace}/crm/contacts
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $contacts = DB::table('crm_contacts')
            ->where('workspace_id', $workspace->id)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $contacts]);
    }

    // POST /workspaces/{workspace}/crm/contacts
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:150',
            'email'   => 'sometimes|nullable|email',
            'phone'   => 'sometimes|nullable|string|max:30',
            'company' => 'sometimes|nullable|string|max:150',
        ]);

        $id = Str::uuid()->toString();
        DB::table('crm_contacts')->insert([
            'id'           => $id,
            'workspace_id' => $workspace->id,
            ...$validated,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return response()->json(['data' => ['id' => $id]], 201);
    }
}
