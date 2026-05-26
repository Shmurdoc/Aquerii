<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmSequence;
use App\Modules\CRM\Models\CrmSequenceEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SequenceController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $sequences = CrmSequence::where('workspace_id', $workspace->id)
            ->withCount('enrollments')
            ->get();

        return response()->json(['data' => $sequences]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('create', [CrmSequence::class, $workspace]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'steps' => 'sometimes|array',
            'steps.*.type' => 'required_with:steps|string|in:email,call,task,wait',
            'steps.*.subject' => 'sometimes|nullable|string|max:255',
            'steps.*.body' => 'sometimes|nullable|string',
            'steps.*.delay_days' => 'sometimes|integer|min:0',
        ]);

        $sequence = CrmSequence::create([
            'workspace_id' => $workspace->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'steps' => $validated['steps'] ?? [],
        ]);

        return response()->json(['data' => $sequence], 201);
    }

    public function show(Workspace $workspace, CrmSequence $sequence): JsonResponse
    {
        abort_if($sequence->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $sequence->load('enrollments.contact')]);
    }

    public function update(Request $request, Workspace $workspace, CrmSequence $sequence): JsonResponse
    {
        abort_if($sequence->workspace_id !== $workspace->id, 404);
        $this->authorize('update', $sequence);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'steps' => 'sometimes|array',
            'steps.*.type' => 'required_with:steps|string|in:email,call,task,wait',
            'steps.*.subject' => 'sometimes|nullable|string|max:255',
            'steps.*.body' => 'sometimes|nullable|string',
            'steps.*.delay_days' => 'sometimes|integer|min:0',
        ]);

        $sequence->update($validated);

        return response()->json(['data' => $sequence]);
    }

    public function destroy(Workspace $workspace, CrmSequence $sequence): JsonResponse
    {
        abort_if($sequence->workspace_id !== $workspace->id, 404);
        $this->authorize('delete', $sequence);

        $sequence->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function enroll(Request $request, Workspace $workspace, CrmSequence $sequence): JsonResponse
    {
        abort_if($sequence->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'contact_id' => 'required|uuid',
            'deal_id' => 'sometimes|nullable|uuid',
        ]);

        $enrollment = CrmSequenceEnrollment::create([
            'sequence_id' => $sequence->id,
            'contact_id' => $validated['contact_id'],
            'deal_id' => $validated['deal_id'] ?? null,
            'status' => 'enrolled',
        ]);

        return response()->json(['data' => $enrollment->load('contact')], 201);
    }

    public function unenroll(Request $request, Workspace $workspace, CrmSequence $sequence, CrmSequenceEnrollment $enrollment): JsonResponse
    {
        abort_if($sequence->workspace_id !== $workspace->id, 404);
        abort_if($enrollment->sequence_id !== $sequence->id, 404);

        $enrollment->update([
            'status' => 'unsubscribed',
            'completed_at' => now(),
        ]);

        return response()->json(['data' => $enrollment]);
    }

    public function progress(Workspace $workspace, CrmSequence $sequence): JsonResponse
    {
        abort_if($sequence->workspace_id !== $workspace->id, 404);

        $enrollments = CrmSequenceEnrollment::where('sequence_id', $sequence->id)
            ->with('contact')
            ->get();

        return response()->json(['data' => $enrollments]);
    }
}
