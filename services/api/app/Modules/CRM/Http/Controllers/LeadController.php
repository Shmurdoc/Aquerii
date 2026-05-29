<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmContact;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Models\CrmLead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeadController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = CrmLead::where('workspace_id', $workspace->id)
            ->with(['contact', 'assignee']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($source = $request->query('source')) {
            $query->where('source', $source);
        }
        if ($assignedTo = $request->query('assigned_to')) {
            $query->where('assigned_to', $assignedTo);
        }
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$this->escapeLike($search)}%")
                    ->orWhere('last_name', 'ilike', "%{$this->escapeLike($search)}%")
                    ->orWhere('email', 'ilike', "%{$this->escapeLike($search)}%")
                    ->orWhere('company_name', 'ilike', "%{$this->escapeLike($search)}%");
            });
        }
        if ($minScore = $request->query('min_score')) {
            $query->where('score', '>=', (int) $minScore);
        }

        $leads = $query->orderByDesc('score')->paginate(50);

        return response()->json(['data' => $leads]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'sometimes|nullable|email|max:255',
            'phone' => 'sometimes|nullable|string|max:30',
            'company_name' => 'sometimes|nullable|string|max:150',
            'source' => 'sometimes|string|max:50',
            'source_url' => 'sometimes|nullable|url',
            'score' => 'sometimes|integer|min:0|max:100',
            'notes' => 'sometimes|nullable|string',
        ]);

        $lead = CrmLead::create(array_merge($validated, [
            'workspace_id' => $workspace->id,
            'score' => $validated['score'] ?? 0,
            'status' => 'new',
        ]));

        return response()->json(['data' => $lead], 201);
    }

    public function show(Workspace $workspace, CrmLead $lead): JsonResponse
    {
        abort_if($lead->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $lead->load(['contact', 'assignee'])]);
    }

    public function update(Request $request, Workspace $workspace, CrmLead $lead): JsonResponse
    {
        abort_if($lead->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'email' => 'sometimes|nullable|email|max:255',
            'phone' => 'sometimes|nullable|string|max:30',
            'company_name' => 'sometimes|nullable|string|max:150',
            'score' => 'sometimes|integer|min:0|max:100',
            'status' => 'sometimes|string|in:new,contacting,qualified,unqualified,converted',
            'notes' => 'sometimes|nullable|string',
        ]);

        $lead->update($validated);

        return response()->json(['data' => $lead]);
    }

    public function destroy(Workspace $workspace, CrmLead $lead): JsonResponse
    {
        abort_if($lead->workspace_id !== $workspace->id, 404);

        $lead->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function assign(Request $request, Workspace $workspace, CrmLead $lead): JsonResponse
    {
        abort_if($lead->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
        ]);

        $lead->update(['assigned_to' => $validated['user_id']]);

        return response()->json(['data' => $lead->load('assignee')]);
    }

    public function convert(Request $request, Workspace $workspace, CrmLead $lead): JsonResponse
    {
        abort_if($lead->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'pipeline_id' => 'required|uuid|exists:crm_pipelines,id',
            'stage_id' => 'required|uuid|exists:crm_pipeline_stages,id',
            'deal_title' => 'sometimes|string|max:255',
            'deal_value' => 'sometimes|nullable|numeric',
        ]);

        return DB::transaction(function () use ($workspace, $lead, $validated) {
            $contact = CrmContact::create([
                'workspace_id' => $workspace->id,
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'source' => $lead->source,
                'source_url' => $lead->source_url,
                'lifecycle_stage' => 'sql',
            ]);

            $maxPos = CrmDeal::where('stage_id', $validated['stage_id'])->max('position') ?? 0;

            $deal = CrmDeal::create([
                'workspace_id' => $workspace->id,
                'pipeline_id' => $validated['pipeline_id'],
                'stage_id' => $validated['stage_id'],
                'contact_id' => $contact->id,
                'title' => $validated['deal_title'] ?? "{$lead->first_name} {$lead->last_name}",
                'value' => $validated['deal_value'] ?? null,
                'currency' => 'USD',
                'owner_id' => $lead->assigned_to,
                'position' => $maxPos + 65536,
            ]);

            $lead->update([
                'contact_id' => $contact->id,
                'status' => 'converted',
            ]);

            return response()->json([
                'data' => [
                    'lead' => $lead->fresh(),
                    'contact' => $contact,
                    'deal' => $deal->load(['stage', 'contact']),
                ],
            ], 201);
        });
    }
}
