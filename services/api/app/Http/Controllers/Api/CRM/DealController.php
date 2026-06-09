<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Models\CrmDeal;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class DealController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = CrmDeal::where('workspace_id', $workspace->id)
            ->with(['stage', 'contact', 'owner']);

        if ($pipelineId = $request->query('pipeline_id')) {
            $query->where('pipeline_id', $pipelineId);
        }
        if ($stageId = $request->query('stage_id')) {
            $query->where('stage_id', $stageId);
        }
        if ($ownerId = $request->query('owner_id')) {
            $query->where('owner_id', $ownerId);
        }
        if ($search = $request->query('search')) {
            $query->where('title', 'ilike', "%{$search}%");
        }

        $deals = $query->orderBy('position')->paginate(50);

        return response()->json(['data' => $deals]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('create', [CrmDeal::class, $workspace]);

        $validated = $request->validate([
            'pipeline_id'         => 'required|uuid',
            'stage_id'            => 'required|uuid',
            'title'               => 'sometimes|string|max:255',
            'value'               => 'sometimes|nullable|numeric',
            'currency'            => 'sometimes|string|size:3',
            'contact_id'          => 'sometimes|nullable|uuid',
            'company_id'          => 'sometimes|nullable|uuid',
            'probability'         => 'sometimes|integer|min:0|max:100',
            'expected_close_date' => 'sometimes|nullable|date',
        ]);

        $maxPos = CrmDeal::where('stage_id', $validated['stage_id'])->max('position') ?? 0;

        $deal = CrmDeal::create(array_merge($validated, [
            'workspace_id' => $workspace->id,
            'owner_id'     => $request->user()->id,
            'title'        => $validated['title'] ?? 'New Deal',
            'currency'     => $validated['currency'] ?? 'USD',
            'position'     => $maxPos + 65536,
        ]));

        return response()->json(['data' => $deal->load(['stage', 'contact', 'owner'])], 201);
    }

    public function show(Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $deal->load(['pipeline', 'stage', 'contact', 'company', 'owner'])]);
    }

    public function update(Request $request, Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);
        $this->authorize('update', $deal);

        $validated = $request->validate([
            'title'               => 'sometimes|string|max:255',
            'stage_id'            => 'sometimes|uuid',
            'value'               => 'sometimes|nullable|numeric',
            'currency'            => 'sometimes|string|size:3',
            'probability'         => 'sometimes|integer|min:0|max:100',
            'expected_close_date' => 'sometimes|nullable|date',
            'contact_id'          => 'sometimes|nullable|uuid',
            'company_id'          => 'sometimes|nullable|uuid',
            'notes'               => 'sometimes|nullable|string',
        ]);

        $deal->update($validated);

        return response()->json(['data' => $deal]);
    }

    public function destroy(Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);
        $this->authorize('delete', $deal);

        $deal->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function move(Request $request, Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'stage_id' => 'required|uuid',
            'position' => 'sometimes|numeric',
        ]);

        $deal->update($validated);

        return response()->json(['data' => $deal]);
    }

    public function score(Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        $aiUrl    = config('services.ai.url', 'http://ai:8002');
        $aiSecret = config('services.ai.secret');

        $response = Http::withHeader('X-Internal-Secret', $aiSecret)
            ->post("{$aiUrl}/internal/score-deal", ['deal_id' => $deal->id]);

        if (!$response->successful()) {
            return response()->json(['error' => ['code' => 'AI_ERROR', 'message' => 'AI scoring failed.']], 502);
        }

        return response()->json(['data' => $response->json()]);
    }
}
