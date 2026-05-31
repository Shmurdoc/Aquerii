<?php

namespace App\Modules\JobCards\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\JobCards\Models\JobCard;
use App\Modules\JobCards\Models\JobCardAttachment;
use App\Modules\JobCards\Models\JobCardMaterial;
use App\Modules\JobCards\Models\JobCardTask;
use App\Modules\JobCards\Models\JobCardTemplate;
use App\Modules\JobCards\Models\JobCardTimeEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
        $jobCard->load(['assignedTo', 'createdBy', 'signedOffBy', 'tasks', 'timeEntries.user', 'attachments', 'materials']);

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

    // ─── Attachments / Photo Capture (JOB-09) ─────────────────────────────

    public function uploadAttachment(Request $request, Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'file' => 'required|file|max:10240|mimes:jpg,jpeg,png,gif,webp,bmp,pdf',
            'category' => 'sometimes|string|in:photo,document,signature,other',
        ]);

        $file = $request->file('file');
        $path = $file->store("job-cards/{$jobCard->id}", 'public');

        $attachment = JobCardAttachment::create([
            'job_card_id' => $jobCard->id,
            'filename' => $file->getClientOriginalName(),
            'filepath' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'category' => $validated['category'] ?? 'photo',
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $attachment], 201);
    }

    public function deleteAttachment(Workspace $workspace, JobCard $jobCard, JobCardAttachment $attachment): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);
        abort_if($attachment->job_card_id !== $jobCard->id, 404);

        Storage::disk('public')->delete($attachment->filepath);
        $attachment->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    // ─── Task / Checklist Management (JOB-12) ──────────────────────────────

    public function addTask(Request $request, Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'description' => 'required|string|max:500',
            'category' => 'sometimes|string|in:general,safety,quality,other',
        ]);

        $position = $jobCard->tasks()->max('position') + 1;

        $task = $jobCard->tasks()->create([
            'description' => $validated['description'],
            'category' => $validated['category'] ?? 'general',
            'position' => $position,
        ]);

        return response()->json(['data' => $task], 201);
    }

    public function updateTask(Request $request, Workspace $workspace, JobCard $jobCard, JobCardTask $task): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);
        abort_if($task->job_card_id !== $jobCard->id, 404);

        $validated = $request->validate([
            'is_checked' => 'sometimes|boolean',
            'description' => 'sometimes|string|max:500',
        ]);

        if (isset($validated['is_checked'])) {
            $validated['completed_by'] = $validated['is_checked'] ? $request->user()->id : null;
            $validated['completed_at'] = $validated['is_checked'] ? now() : null;
        }

        $task->update($validated);

        return response()->json(['data' => $task->fresh()]);
    }

    public function deleteTask(Workspace $workspace, JobCard $jobCard, JobCardTask $task): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);
        abort_if($task->job_card_id !== $jobCard->id, 404);

        $task->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    // ─── Materials Tracking (JOB-10) ───────────────────────────────────────

    public function materials(Request $request, Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);

        $materials = $jobCard->materials()->orderBy('created_at')->get();

        return response()->json(['data' => $materials]);
    }

    public function addMaterial(Request $request, Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'unit' => 'nullable|string|max:50',
            'quantity' => 'required|numeric|min:0.01',
            'unit_price' => 'required|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $total = $validated['quantity'] * $validated['unit_price'];

        $material = JobCardMaterial::create([
            'job_card_id' => $jobCard->id,
            'name' => $validated['name'],
            'unit' => $validated['unit'] ?? null,
            'quantity' => $validated['quantity'],
            'unit_price' => $validated['unit_price'],
            'total' => $total,
            'supplier' => $validated['supplier'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $material], 201);
    }

    public function deleteMaterial(Workspace $workspace, JobCard $jobCard, JobCardMaterial $material): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);
        abort_if($material->job_card_id !== $jobCard->id, 404);

        $material->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    // ─── Labour / Time Tracking (JOB-11) ───────────────────────────────────

    public function startTimer(Request $request, Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);

        $active = $jobCard->timeEntries()->whereNull('ended_at')->where('user_id', $request->user()->id)->first();
        if ($active) {
            return response()->json(['data' => $active, 'message' => 'Timer already running'], 200);
        }

        $entry = JobCardTimeEntry::create([
            'job_card_id' => $jobCard->id,
            'user_id' => $request->user()->id,
            'started_at' => now(),
        ]);

        return response()->json(['data' => $entry], 201);
    }

    public function stopTimer(Request $request, Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);

        $entry = $jobCard->timeEntries()
            ->whereNull('ended_at')
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $endedAt = now();
        $duration = $entry->started_at->diffInMinutes($endedAt);

        $entry->update([
            'ended_at' => $endedAt,
            'duration_minutes' => $duration,
        ]);

        return response()->json(['data' => $entry->fresh()]);
    }

    public function timeEntries(Request $request, Workspace $workspace, JobCard $jobCard): JsonResponse
    {
        abort_if($jobCard->workspace_id !== $workspace->id, 404);

        $entries = $jobCard->timeEntries()->with('user')->orderBy('started_at', 'desc')->get();

        return response()->json(['data' => $entries]);
    }
}
