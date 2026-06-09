<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Shift;
use App\Core\Models\ShiftAssignment;
use App\Core\Models\ShiftHandover;
use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    // ===== Shift Definitions =====

    public function indexShifts(Request $request, Workspace $workspace): JsonResponse
    {
        $shifts = Shift::where('workspace_id', $workspace->id)
            ->withCount('assignments')
            ->orderBy('start_time')
            ->get();

        return response()->json(['data' => $shifts]);
    }

    public function storeShift(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'required|string|date_format:H:i',
            'end_time' => 'required|string|date_format:H:i',
            'duration_hours' => 'sometimes|numeric|min:0.5|max:24',
            'color' => 'nullable|string|max:20',
            'type' => 'sometimes|string|max:30',
            'description' => 'nullable|string|max:1000',
        ]);

        $shift = Shift::create(array_merge(
            $validated,
            ['workspace_id' => $workspace->id]
        ));

        return response()->json(['data' => $shift], 201);
    }

    public function showShift(Workspace $workspace, string $shift): JsonResponse
    {
        $shift = Shift::where('workspace_id', $workspace->id)
            ->with('assignments.user')
            ->findOrFail($shift);

        return response()->json(['data' => $shift]);
    }

    public function updateShift(Request $request, Workspace $workspace, string $shift): JsonResponse
    {
        $shift = Shift::where('workspace_id', $workspace->id)->findOrFail($shift);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'start_time' => 'sometimes|required|string|date_format:H:i',
            'end_time' => 'sometimes|required|string|date_format:H:i',
            'duration_hours' => 'sometimes|numeric|min:0.5|max:24',
            'color' => 'nullable|string|max:20',
            'type' => 'sometimes|string|max:30',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'sometimes|boolean',
        ]);

        $shift->update($validated);

        return response()->json(['data' => $shift]);
    }

    public function destroyShift(Workspace $workspace, string $shift): JsonResponse
    {
        $shift = Shift::where('workspace_id', $workspace->id)->findOrFail($shift);
        $shift->delete();

        return response()->json(null, 204);
    }

    // ===== Shift Assignments =====

    public function indexAssignments(Request $request, Workspace $workspace): JsonResponse
    {
        $query = ShiftAssignment::where('shift_assignments.workspace_id', $workspace->id)
            ->with(['shift', 'user']);

        if ($request->filled('date')) {
            $query->where('shift_assignments.date', $request->date);
        }
        if ($request->filled('from')) {
            $query->where('shift_assignments.date', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->where('shift_assignments.date', '<=', $request->to);
        }
        if ($request->filled('user_id')) {
            $query->where('shift_assignments.user_id', $request->user_id);
        }
        if ($request->filled('shift_id')) {
            $query->where('shift_assignments.shift_id', $request->shift_id);
        }

        $assignments = $query->orderBy('shift_assignments.date')->orderBy('shift_assignments.created_at')->paginate(100);

        return response()->json($assignments);
    }

    public function storeAssignment(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'shift_id' => 'required|string|exists:shifts,id',
            'user_id' => 'required|string|exists:users,id',
            'date' => 'required|date',
            'status' => 'sometimes|string|max:30',
            'notes' => 'nullable|string|max:1000',
        ]);

        $duplicate = ShiftAssignment::where('workspace_id', $workspace->id)
            ->where('user_id', $validated['user_id'])
            ->where('date', $validated['date'])
            ->exists();

        if ($duplicate) {
            return response()->json(['message' => 'This user is already assigned to a shift on this date.'], 422);
        }

        $assignment = ShiftAssignment::create(array_merge(
            $validated,
            [
                'workspace_id' => $workspace->id,
                'status' => $validated['status'] ?? 'scheduled',
            ]
        ));

        return response()->json(['data' => $assignment], 201);
    }

    // Bulk assign: multiple users to same shift on same date
    public function storeAssignmentsBulk(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'shift_id' => 'required|string|exists:shifts,id',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'required|string|exists:users,id',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $created = [];
        foreach ($validated['user_ids'] as $userId) {
            $assignment = ShiftAssignment::firstOrCreate(
                ['workspace_id' => $workspace->id, 'user_id' => $userId, 'date' => $validated['date']],
                ['shift_id' => $validated['shift_id'], 'notes' => $validated['notes'] ?? null]
            );
            $created[] = $assignment;
        }

        return response()->json(['data' => $created], 201);
    }

    public function updateAssignment(Request $request, Workspace $workspace, string $assignment): JsonResponse
    {
        $assignment = ShiftAssignment::where('workspace_id', $workspace->id)->findOrFail($assignment);

        $validated = $request->validate([
            'shift_id' => 'sometimes|required|string|exists:shifts,id',
            'status' => 'sometimes|string|max:30',
            'clocked_in_at' => 'nullable|date',
            'clocked_out_at' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $assignment->update($validated);

        return response()->json(['data' => $assignment]);
    }

    public function destroyAssignment(Workspace $workspace, string $assignment): JsonResponse
    {
        $assignment = ShiftAssignment::where('workspace_id', $workspace->id)->findOrFail($assignment);
        $assignment->delete();

        return response()->json(null, 204);
    }

    // ===== Shift Handovers =====

    public function indexHandovers(Request $request, Workspace $workspace): JsonResponse
    {
        $handovers = ShiftHandover::where('workspace_id', $workspace->id)
            ->with(['departingUser', 'incomingUser'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($handovers);
    }

    public function storeHandover(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'from_assignment_id' => 'nullable|string|exists:shift_assignments,id',
            'to_assignment_id' => 'nullable|string|exists:shift_assignments,id',
            'incoming_user_id' => 'nullable|string|exists:users,id',
            'departing_notes' => 'required|string|max:10000',
            'incoming_notes' => 'nullable|string|max:10000',
        ]);

        $handover = ShiftHandover::create(array_merge(
            $validated,
            [
                'workspace_id' => $workspace->id,
                'departing_user_id' => $request->user()->id,
                'departing_signed_at' => now(),
                'status' => 'pending',
            ]
        ));

        return response()->json(['data' => $handover], 201);
    }

    public function acknowledgeHandover(Request $request, Workspace $workspace, string $handover): JsonResponse
    {
        $handover = ShiftHandover::where('workspace_id', $workspace->id)->findOrFail($handover);

        $validated = $request->validate([
            'incoming_notes' => 'nullable|string|max:10000',
        ]);

        $handover->update([
            'incoming_user_id' => $request->user()->id,
            'incoming_notes' => $validated['incoming_notes'] ?? null,
            'incoming_acknowledged_at' => now(),
            'status' => 'acknowledged',
        ]);

        return response()->json(['data' => $handover]);
    }

    public function showHandover(Workspace $workspace, string $handover): JsonResponse
    {
        $handover = ShiftHandover::where('workspace_id', $workspace->id)
            ->with(['departingUser', 'incomingUser'])
            ->findOrFail($handover);

        return response()->json(['data' => $handover]);
    }
}
