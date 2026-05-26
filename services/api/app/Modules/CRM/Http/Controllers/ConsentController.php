<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmContact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsentController extends Controller
{
    public function show(Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => [
            'contact_id' => $contact->id,
            'consent_gdpr' => $contact->consent_gdpr,
            'consent_marketing' => $contact->consent_marketing,
            'consent_preferences' => $contact->consent_preferences ?? [],
            'updated_at' => $contact->updated_at,
        ]]);
    }

    public function update(Request $request, Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'consent_gdpr' => 'sometimes|boolean',
            'consent_marketing' => 'sometimes|boolean',
            'consent_preferences' => 'sometimes|nullable|array',
        ]);

        $contact->update($validated);

        return response()->json(['data' => [
            'contact_id' => $contact->id,
            'consent_gdpr' => $contact->consent_gdpr,
            'consent_marketing' => $contact->consent_marketing,
            'consent_preferences' => $contact->consent_preferences ?? [],
            'updated_at' => $contact->updated_at,
        ]]);
    }

    public function export(Workspace $workspace, CrmContact $contact): JsonResponse
    {
        abort_if($contact->workspace_id !== $workspace->id, 404);

        $data = $contact->load(['company', 'deals', 'relationships', 'stageHistory']);

        return response()->json(['data' => [
            'exported_at' => now()->toIso8601String(),
            'contact' => $data->toArray(),
        ]]);
    }
}
