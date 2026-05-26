<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Http\Resources\CrmContactResource;
use App\Modules\CRM\Models\CrmContact;
use App\Modules\CRM\Services\ContactLifecycleService;
use App\Modules\CRM\Services\CrmAutomationService;
use App\Modules\CRM\Services\DuplicateDetectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function __construct(
        protected ContactLifecycleService $lifecycleService,
        protected DuplicateDetectionService $duplicateService,
        protected CrmAutomationService $automationService,
    ) {}

    public function index(Request $request, Workspace $workspace)
    {
        abort_unless(auth()->user()->workspaces()->where('workspace_id', $workspace->id)->exists(), 403);

        $query = CrmContact::where('workspace_id', $workspace->id)
            ->with('company');

        if ($companyId = $request->query('company_id')) {
            $query->where('company_id', $companyId);
        }
        if ($stageId = $request->query('stage_id')) {
            $query->where('stage_id', $stageId);
        }
        if ($lifecycleStage = $request->query('lifecycle_stage')) {
            $query->where('lifecycle_stage', $lifecycleStage);
        }
        if ($source = $request->query('source')) {
            $query->where('source', $source);
        }
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                    ->orWhere('last_name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }
        if ($request->boolean('stale_days')) {
            $query->where('last_touched_at', '<', now()->subDays((int) $request->query('stale_days', 90)))
                ->orWhereNull('last_touched_at');
        }

        $contacts = $query->orderBy('last_name')->paginate(50);

        return CrmContactResource::collection($contacts);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('create', [CrmContact::class, $workspace]);

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'sometimes|nullable|email|max:255',
            'phone' => 'sometimes|nullable|string|max:30',
            'job_title' => 'sometimes|nullable|string|max:150',
            'social_links' => 'sometimes|nullable|array',
            'company_id' => 'sometimes|nullable|uuid',
            'stage_id' => 'sometimes|nullable|uuid',
            'lifecycle_stage' => 'sometimes|string|in:lead,mql,sql,customer,advocate',
            'lead_score' => 'sometimes|integer|min:0|max:100',
            'tags' => 'sometimes|array',
            'source' => 'sometimes|string|max:50',
            'source_url' => 'sometimes|nullable|url',
            'consent_gdpr' => 'sometimes|boolean',
            'consent_marketing' => 'sometimes|boolean',
        ]);

        $contact = CrmContact::create(array_merge($validated, [
            'workspace_id' => $workspace->id,
            'lifecycle_stage' => $validated['lifecycle_stage'] ?? 'lead',
            'source' => $validated['source'] ?? 'manual',
        ]));

        $this->automationService->evaluate($workspace->id, 'contact.created', [
            'contact_id' => $contact->id,
            'lifecycle_stage' => $contact->lifecycle_stage,
            'lead_score' => $contact->lead_score,
            'source' => $contact->source,
            'entity_id' => $contact->id,
            'entity_type' => 'contact',
        ]);

        return response()->json(['data' => $contact], 201);
    }

    public function show(Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $contact->load(['company', 'deals', 'relationships.relatedContact', 'stageHistory'])]);
    }

    public function update(Request $request, Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);
        $this->authorize('update', $contact);

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'email' => 'sometimes|nullable|email|max:255',
            'phone' => 'sometimes|nullable|string|max:30',
            'job_title' => 'sometimes|nullable|string|max:150',
            'social_links' => 'sometimes|nullable|array',
            'company_id' => 'sometimes|nullable|uuid',
            'stage_id' => 'sometimes|nullable|uuid',
            'lifecycle_stage' => 'sometimes|string|in:lead,mql,sql,customer,advocate',
            'lead_score' => 'sometimes|integer|min:0|max:100',
            'tags' => 'sometimes|array',
            'notes' => 'sometimes|nullable|string',
            'deal_value' => 'sometimes|nullable|numeric',
            'source' => 'sometimes|string|max:50',
        ]);

        $contact->update($validated);

        return response()->json(['data' => $contact]);
    }

    public function destroy(Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);
        $this->authorize('delete', $contact);

        $contact->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function transition(Request $request, Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'to_stage' => 'required|string|in:lead,mql,sql,customer,advocate',
            'reason' => 'sometimes|nullable|string|max:500',
        ]);

        try {
            $oldStage = $contact->lifecycle_stage;
            $contact = $this->lifecycleService->transition(
                $contact,
                $validated['to_stage'],
                $validated['reason'] ?? null,
                $request->user()->id,
            );

            $this->automationService->evaluate($workspace->id, 'contact.stage_changed', [
                'contact_id' => $contact->id,
                'prev_stage' => $oldStage,
                'lifecycle_stage' => $contact->lifecycle_stage,
                'lead_score' => $contact->lead_score,
                'entity_id' => $contact->id,
                'entity_type' => 'contact',
            ]);

            return response()->json(['data' => $contact->load('stageHistory')]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => ['code' => 'INVALID_TRANSITION', 'message' => $e->getMessage()]], 422);
        }
    }

    public function duplicates(Request $request, Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);

        $threshold = (float) $request->query('threshold', 0.8);
        $duplicates = $this->duplicateService->findDuplicates($contact, $threshold);

        return response()->json(['data' => $duplicates]);
    }

    public function merge(Request $request, Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'duplicate_id' => 'required|uuid|exists:crm_contacts,id',
        ]);

        $duplicate = CrmContact::findOrFail($validated['duplicate_id']);
        abort_if($duplicate->workspace_id !== $workspace->id, 404);

        $merged = $this->duplicateService->mergeContacts($contact, $duplicate);

        return response()->json(['data' => $merged->load(['company', 'deals'])]);
    }

    public function addRelationship(Request $request, Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'related_contact_id' => 'required|uuid|exists:crm_contacts,id',
            'relationship_type' => 'required|string|in:reports_to,decision_maker,colleague,spouse',
        ]);

        $related = CrmContact::findOrFail($validated['related_contact_id']);
        abort_if($related->workspace_id !== $workspace->id, 404);

        $relationship = $contact->relationships()->create([
            'workspace_id' => $workspace->id,
            'related_contact_id' => $validated['related_contact_id'],
            'relationship_type' => $validated['relationship_type'],
        ]);

        return response()->json(['data' => $relationship], 201);
    }

    public function removeRelationship(Workspace $workspace, CrmContact $contact, string $relationshipId): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);

        $deleted = $contact->relationships()->where('id', $relationshipId)->delete();

        return response()->json(['data' => ['deleted' => (bool) $deleted]]);
    }

    public function touch(Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);

        $contact->touchContact();

        return response()->json(['data' => ['touched_at' => $contact->fresh()->last_touched_at]]);
    }
}
