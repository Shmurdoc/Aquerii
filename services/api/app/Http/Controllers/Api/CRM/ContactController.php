<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Models\CrmContact;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = CrmContact::where('workspace_id', $workspace->id)
            ->with('company');

        if ($companyId = $request->query('company_id')) {
            $query->where('company_id', $companyId);
        }
        if ($stageId = $request->query('stage_id')) {
            $query->where('stage_id', $stageId);
        }
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                  ->orWhere('last_name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $contacts = $query->orderBy('last_name')->paginate(50);

        return response()->json(['data' => $contacts]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('create', [CrmContact::class, $workspace]);

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name'  => 'required|string|max:100',
            'email'      => 'sometimes|nullable|email|max:255',
            'phone'      => 'sometimes|nullable|string|max:30',
            'company_id' => 'sometimes|nullable|uuid',
            'stage_id'   => 'sometimes|nullable|uuid',
            'lead_score' => 'sometimes|integer|min:0|max:100',
            'tags'       => 'sometimes|array',
        ]);

        $contact = CrmContact::create(array_merge($validated, [
            'workspace_id' => $workspace->id,
        ]));

        return response()->json(['data' => $contact], 201);
    }

    public function show(Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $contact->load(['company', 'deals'])]);
    }

    public function update(Request $request, Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);
        $this->authorize('update', $contact);

        $validated = $request->validate([
            'first_name'  => 'sometimes|string|max:100',
            'last_name'   => 'sometimes|string|max:100',
            'email'       => 'sometimes|nullable|email|max:255',
            'phone'       => 'sometimes|nullable|string|max:30',
            'company_id'  => 'sometimes|nullable|uuid',
            'stage_id'    => 'sometimes|nullable|uuid',
            'lead_score'  => 'sometimes|integer|min:0|max:100',
            'tags'        => 'sometimes|array',
            'notes'       => 'sometimes|nullable|string',
            'deal_value'  => 'sometimes|nullable|numeric',
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
}
