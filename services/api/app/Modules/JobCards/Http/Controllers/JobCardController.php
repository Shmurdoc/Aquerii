<?php

namespace App\Modules\JobCards\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\JobCards\Models\JobCard;
use App\Modules\JobCards\Models\JobCardTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobCardController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = JobCard::where('workspace_id', $workspace->id)
            ->with(['assignedTo', 'createdBy', 'tasks']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($priority = $request->query('priority')) {
            $query->where('priority', $priority);
        }

        if ($assignedTo = $request->query('assigned_to')) {
            $query->where('assigned_to', $assignedTo);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$this->escapeLike($search)}%")
                    ->orWhere('description', 'ilike', "%{$this->escapeLike($search)}%");
            });
        }

        $cards = $query->orderBy('created_at', 'desc')
            ->paginate($request->query('per_page', 50));

        return response()->json($cards);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|string|in:new,in_progress,completed,signed_off,rejected',
            'priority' => 'sometimes|string|in:low,medium,high,critical',
            'assigned_to' => 'nullable|string|exists:users,id',
            'client_id' => 'nullable|string',
            'industry_template' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:255',
            'custom_fields' => 'nullable|json',
            'started_at' => 'nullable|date',
            'tasks' => 'nullable|array',
            'tasks.*.description' => 'required|string|max:500',
            'tasks.*.category' => 'sometimes|string|max:50',
        ]);

        $card = JobCard::create([
            'workspace_id' => $workspace->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'new',
            'priority' => $validated['priority'] ?? 'medium',
            'assigned_to' => $validated['assigned_to'] ?? null,
            'client_id' => $validated['client_id'] ?? null,
            'industry_template' => $validated['industry_template'] ?? null,
            'location' => $validated['location'] ?? null,
            'custom_fields' => $validated['custom_fields'] ?? null,
            'started_at' => $validated['started_at'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        if (!empty($validated['tasks'])) {
            foreach ($validated['tasks'] as $i => $task) {
                $card->tasks()->create([
                    'description' => $task['description'],
                    'category' => $task['category'] ?? 'general',
                    'position' => $i,
                ]);
            }
        }

        $card->load(['assignedTo', 'createdBy', 'tasks']);

        return response()->json(['data' => $card], 201);
    }

    public function show(Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);
        $jobCard->load(['assignedTo', 'createdBy', 'signedOffBy', 'tasks', 'timeEntries.user', 'attachments']);

        return response()->json(['data' => $jobCard]);
    }

    public function update(Request $request, Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|string|in:new,in_progress,completed,signed_off,rejected',
            'priority' => 'sometimes|string|in:low,medium,high,critical',
            'assigned_to' => 'nullable|string|exists:users,id',
            'client_id' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'custom_fields' => 'nullable|json',
            'started_at' => 'nullable|date',
            'rejection_reason' => 'nullable|string',
        ]);

        $newStatus = $validated['status'] ?? null;
        if ($newStatus === 'in_progress' && !$jobCard->started_at) {
            $validated['started_at'] = now();
        } elseif ($newStatus === 'completed') {
            $validated['completed_at'] = now();
        }

        $jobCard->update($validated);

        return response()->json(['data' => $jobCard->fresh()->load(['assignedTo', 'createdBy', 'tasks'])]);
    }

    public function destroy(Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);
        $jobCard->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function signOff(Request $request, Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);
        abort_if($jobCard->status === 'signed_off', 422, 'Job card is already signed off.');

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $jobCard->update([
            'status' => 'signed_off',
            'signed_off_at' => now(),
            'signed_off_by' => $request->user()->id,
            'signoff_notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(['data' => $jobCard->fresh()->load(['assignedTo', 'createdBy', 'signedOffBy'])]);
    }

    public function reject(Request $request, Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);
        abort_if($jobCard->status === 'signed_off', 422, 'Job card is already signed off.');

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $jobCard->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return response()->json(['data' => $jobCard->fresh()->load(['assignedTo', 'createdBy'])]);
    }

    public function templates(Request $request, Workspace $workspace): JsonResponse
    {
        $templates = JobCardTemplate::where(function ($q) use ($workspace) {
            $q->where('is_global', true)
                ->orWhere('workspace_id', $workspace->id);
        })->orderBy('name')->get();

        return response()->json(['data' => $templates]);
    }

    public function storeTemplate(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'industry' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'default_tasks' => 'nullable|array',
            'default_fields' => 'nullable|json',
            'safety_checklist' => 'nullable|array',
            'is_global' => 'sometimes|boolean',
        ]);

        $template = JobCardTemplate::create([
            'workspace_id' => $workspace->id,
            'name' => $validated['name'],
            'industry' => $validated['industry'] ?? null,
            'description' => $validated['description'] ?? null,
            'default_tasks' => $validated['default_tasks'] ?? null,
            'default_fields' => $validated['default_fields'] ?? null,
            'safety_checklist' => $validated['safety_checklist'] ?? null,
            'is_global' => $validated['is_global'] ?? false,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $template], 201);
    }
}
