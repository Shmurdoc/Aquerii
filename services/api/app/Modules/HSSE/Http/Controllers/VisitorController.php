<?php

namespace App\Modules\HSSE\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\HSSE\Models\VisitorLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VisitorController extends Controller
{
    public function activeVisitors(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $visitors = VisitorLog::where('workspace_id', $workspace->id)
            ->whereNull('signed_out_at')
            ->with('hostUser:id,name,email')
            ->orderBy('signed_in_at', 'desc')
            ->get();

        return response()->json(['data' => $visitors]);
    }

    public function signIn(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $validated = $request->validate([
            'kiosk_id' => 'nullable|string|max:255',
            'visitor_type' => 'required|string|max:255',
            'full_name' => 'required|string|max:255',
            'company' => 'required|string|max:255',
            'id_number' => 'nullable|string|max:255',
            'vehicle_reg' => 'nullable|string|max:255',
            'host_name' => 'required|string|max:255',
            'host_contact' => 'nullable|string|max:255',
            'host_user_id' => 'nullable|uuid|exists:users,id',
            'purpose' => 'required|string|max:5000',
            'notify_host' => 'nullable|boolean',
        ]);

        $visitor = VisitorLog::create([
            'workspace_id' => $workspace->id,
            'kiosk_id' => $validated['kiosk_id'] ?? null,
            'visitor_type' => $validated['visitor_type'],
            'full_name' => $validated['full_name'],
            'company' => $validated['company'],
            'id_number' => $validated['id_number'] ?? null,
            'vehicle_reg' => $validated['vehicle_reg'] ?? null,
            'host_name' => $validated['host_name'],
            'host_contact' => $validated['host_contact'] ?? null,
            'host_user_id' => $validated['host_user_id'] ?? null,
            'host_notified' => ($validated['notify_host'] ?? false) && isset($validated['host_user_id']),
            'host_notified_at' => ($validated['notify_host'] ?? false) && isset($validated['host_user_id'])
                ? now() : null,
            'purpose' => $validated['purpose'],
        ]);

        return response()->json(['data' => $visitor], 201);
    }

    public function signOut(Request $request, Workspace $workspace, VisitorLog $visitor): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $visitor->workspace_id === $workspace->id,
            404
        );

        $now = now();

        $visitor->update([
            'signed_out_at' => $now,
            'duration_minutes' => $visitor->signed_in_at
                ? $visitor->signed_in_at->diffInMinutes($now)
                : null,
        ]);

        return response()->json(['data' => $visitor->fresh()]);
    }

    public function markBadgePrinted(Request $request, Workspace $workspace, VisitorLog $visitor): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $visitor->workspace_id === $workspace->id,
            404
        );

        $visitor->update([
            'badge_printed' => true,
            'badge_printed_at' => now(),
        ]);

        return response()->json(['data' => $visitor->fresh()]);
    }
}
