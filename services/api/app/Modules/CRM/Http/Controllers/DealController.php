<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Services\CrmAutomationService;
use App\Modules\CRM\Services\DealApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class DealController extends Controller
{
    public function __construct(
        protected CrmAutomationService $automationService,
        protected DealApprovalService $approvalService,
    ) {}

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
            'pipeline_id' => 'required|uuid',
            'stage_id' => 'required|uuid',
            'title' => 'required|string|max:255',
            'value' => 'sometimes|nullable|numeric',
            'currency' => 'sometimes|string|size:3',
            'contact_id' => 'sometimes|nullable|uuid',
            'company_id' => 'sometimes|nullable|uuid',
            'probability' => 'sometimes|integer|min:0|max:100',
            'expected_close_date' => 'sometimes|nullable|date',
        ]);

        $maxPos = CrmDeal::where('stage_id', $validated['stage_id'])->max('position') ?? 0;

        $deal = CrmDeal::create(array_merge($validated, [
            'workspace_id' => $workspace->id,
            'owner_id' => $request->user()->id,
            'title' => $validated['title'],
            'currency' => $validated['currency'] ?? 'USD',
            'position' => $maxPos + 65536,
        ]));

        $this->automationService->evaluate($workspace->id, 'deal.created', [
            'deal_id'     => $deal->id,
            'value'       => $deal->value,
            'owner_id'    => $deal->owner_id,
            'entity_id'   => $deal->id,
            'entity_type' => 'deal',
        ]);

        $this->approvalService->createApprovalIfNeeded($deal);

        return response()->json(['data' => $deal->load(['stage', 'contact', 'owner'])], 201);
    }

    public function show(Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $deal->load(['pipeline', 'stage', 'contact', 'company', 'owner', 'linkedItem', 'activities'])]);
    }

    public function update(Request $request, Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);
        $this->authorize('update', $deal);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'stage_id' => 'sometimes|uuid',
            'value' => 'sometimes|nullable|numeric',
            'currency' => 'sometimes|string|size:3',
            'probability' => 'sometimes|integer|min:0|max:100',
            'expected_close_date' => 'sometimes|nullable|date',
            'contact_id' => 'sometimes|nullable|uuid',
            'company_id' => 'sometimes|nullable|uuid',
            'linked_item_id' => 'sometimes|nullable|uuid|exists:items,id',
            'notes' => 'sometimes|nullable|string',
        ]);

        $deal->update($validated);

        return response()->json(['data' => $deal->load(['pipeline', 'stage', 'contact', 'company', 'owner', 'linkedItem'])]);
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

        $oldStageId = $deal->stage_id;
        $deal->update($validated);

        if (isset($validated['stage_id']) && $validated['stage_id'] !== $oldStageId) {
            $this->automationService->evaluate($workspace->id, 'deal.stage_changed', [
                'deal_id'      => $deal->id,
                'stage_id'     => $deal->stage_id,
                'prev_stage_id' => $oldStageId,
                'value'        => $deal->value,
                'entity_id'    => $deal->id,
                'entity_type'  => 'deal',
            ]);
        }

        return response()->json(['data' => $deal]);
    }

    public function linkItem(Request $request, Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'item_id' => 'required|uuid|exists:items,id',
        ]);

        $deal->update(['linked_item_id' => $validated['item_id']]);

        return response()->json(['data' => $deal->load('linkedItem')]);
    }

    public function unlinkItem(Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        $deal->update(['linked_item_id' => null]);

        return response()->json(['data' => $deal]);
    }

    public function markWon(Request $request, Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'won_at' => 'sometimes|nullable|date',
        ]);

        $deal->update([
            'won_at' => $validated['won_at'] ?? now(),
            'lost_at' => null,
            'loss_reason' => null,
            'loss_details' => null,
        ]);

        $this->automationService->evaluate($workspace->id, 'deal.won', [
            'deal_id'     => $deal->id,
            'value'       => $deal->value,
            'entity_id'   => $deal->id,
            'entity_type' => 'deal',
        ]);

        return response()->json(['data' => $deal->load(['pipeline', 'stage', 'contact'])]);
    }

    public function markLost(Request $request, Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'loss_reason' => 'sometimes|nullable|string|max:50',
            'loss_details' => 'sometimes|nullable|string',
            'lost_at' => 'sometimes|nullable|date',
        ]);

        $deal->update([
            'lost_at' => $validated['lost_at'] ?? now(),
            'won_at' => null,
            'loss_reason' => $validated['loss_reason'] ?? null,
            'loss_details' => $validated['loss_details'] ?? null,
        ]);

        $this->automationService->evaluate($workspace->id, 'deal.lost', [
            'deal_id'     => $deal->id,
            'value'       => $deal->value,
            'loss_reason' => $deal->loss_reason,
            'entity_id'   => $deal->id,
            'entity_type' => 'deal',
        ]);

        return response()->json(['data' => $deal->load(['pipeline', 'stage', 'contact'])]);
    }

    public function score(Workspace $workspace, CrmDeal $deal): JsonResponse
    {
        abort_if($deal->workspace_id !== $workspace->id, 404);

        $aiUrl = config('services.ai.url', 'http://ai:8002');
        $aiSecret = config('services.ai.secret');

        $response = Http::withHeader('X-Internal-Secret', $aiSecret)
            ->post("{$aiUrl}/internal/score-deal", ['deal_id' => $deal->id]);

        if (! $response->successful()) {
            return response()->json(['error' => ['code' => 'AI_ERROR', 'message' => 'AI scoring failed.']], 502);
        }

        return response()->json(['data' => $response->json()]);
    }
}
