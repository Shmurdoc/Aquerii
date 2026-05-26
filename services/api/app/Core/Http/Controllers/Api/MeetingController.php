<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Meeting;
use App\Core\Models\MeetingAttendee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeetingController extends Controller
{
    public function index(Request $request, string $workspaceId): JsonResponse
    {
        $query = Meeting::where('workspace_id', $workspaceId)
            ->with(['organizer:id,name', 'attendees:meeting_id,email,name,status']);

        if ($request->query('from')) {
            $query->where('starts_at', '>=', $request->query('from'));
        }

        if ($request->query('to')) {
            $query->where('ends_at', '<=', $request->query('to'));
        }

        if ($request->query('status')) {
            $query->where('status', $request->query('status'));
        }

        $meetings = $query->orderBy('starts_at')->get();

        return response()->json(['meetings' => $meetings]);
    }

    public function show(Request $request, string $workspaceId, string $meetingId): JsonResponse
    {
        $meeting = Meeting::where('workspace_id', $workspaceId)
            ->with(['organizer:id,name,email', 'attendees'])
            ->findOrFail($meetingId);

        return response()->json(['meeting' => $meeting]);
    }

    public function store(Request $request, string $workspaceId): JsonResponse
    {
        $data = $request->validate([
            'title'              => 'required|string|max:255',
            'description'        => 'nullable|string',
            'location'           => 'nullable|string|max:255',
            'meeting_url'        => 'nullable|url|max:500',
            'starts_at'          => 'required|date',
            'ends_at'            => 'required|date|after:starts_at',
            'provider'           => 'nullable|string|in:zoom,teams,google,other',
            'recurrence_rule'    => 'nullable|string|max:255',
            'settings'           => 'nullable|array',
            'attendees'           => 'nullable|array',
            'attendees.*.email'   => 'required|email',
            'attendees.*.name'    => 'nullable|string',
            'attendees.*.required' => 'nullable|boolean',
        ]);

        $meeting = Meeting::create([
            'workspace_id'     => $workspaceId,
            'title'            => $data['title'],
            'description'      => $data['description'] ?? null,
            'location'         => $data['location'] ?? null,
            'meeting_url'      => $data['meeting_url'] ?? null,
            'starts_at'        => $data['starts_at'],
            'ends_at'          => $data['ends_at'],
            'status'           => 'scheduled',
            'organizer_id'     => $request->user()->id,
            'provider'         => $data['provider'] ?? 'zoom',
            'recurrence_rule'  => $data['recurrence_rule'] ?? null,
            'settings'         => $data['settings'] ?? null,
        ]);

        if (!empty($data['attendees'])) {
            foreach ($data['attendees'] as $a) {
                $meeting->attendees()->create([
                    'email'    => $a['email'],
                    'name'     => $a['name'] ?? null,
                    'required' => $a['required'] ?? true,
                    'status'   => 'pending',
                ]);
            }
        }

        $meeting->load(['organizer:id,name', 'attendees']);

        return response()->json(['meeting' => $meeting], 201);
    }

    public function update(Request $request, string $workspaceId, string $meetingId): JsonResponse
    {
        $meeting = Meeting::where('workspace_id', $workspaceId)->findOrFail($meetingId);

        $data = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'location'    => 'nullable|string|max:255',
            'meeting_url' => 'nullable|url|max:500',
            'starts_at'   => 'sometimes|date',
            'ends_at'     => 'sometimes|date|after:starts_at',
            'status'      => 'sometimes|in:scheduled,ongoing,completed,cancelled',
            'settings'    => 'nullable|array',
        ]);

        $meeting->update($data);

        return response()->json(['meeting' => $meeting->fresh(['organizer:id,name', 'attendees'])]);
    }

    public function destroy(Request $request, string $workspaceId, string $meetingId): JsonResponse
    {
        $meeting = Meeting::where('workspace_id', $workspaceId)->findOrFail($meetingId);
        $meeting->delete();

        return response()->json(['success' => true]);
    }

    public function updateAttendance(Request $request, string $workspaceId, string $meetingId): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:accepted,declined,tentative',
        ]);

        $attendee = MeetingAttendee::whereHas('meeting', fn($q) =>
            $q->where('workspace_id', $workspaceId)
        )->where('meeting_id', $meetingId)
         ->where('email', $request->user()->email)
         ->firstOrFail();

        $attendee->update([
            'status'       => $data['status'],
            'responded_at' => now(),
        ]);

        return response()->json(['attendee' => $attendee]);
    }
}
