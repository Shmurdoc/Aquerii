<?php

namespace App\Http\Controllers\Api;

use App\Core\Models\User;
use App\Core\Models\VisitorLog;
use App\Core\Models\Workspace;
use App\Http\Controllers\Controller;
use App\Notifications\VisitorArrivedNotification;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VisitorController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum,gate-kiosk');
    }

    public function signIn(Request $request, string $workspaceId): JsonResponse
    {
        $workspace = Workspace::findOrFail($workspaceId);

        $validated = $request->validate([
            'kiosk_id' => 'nullable|string|uuid|exists:gate_kiosks,id',
            'visitor_type' => 'required|string|in:supplier,inspector,guest,job_applicant',
            'full_name' => 'required|string|min:2|max:255',
            'company' => 'required|string|min:2|max:255',
            'id_number' => 'nullable|string|min:4|max:100',
            'vehicle_reg' => 'nullable|string|max:50',
            'host_name' => 'required|string|min:2|max:255',
            'host_contact' => 'nullable|string|max:50',
            'purpose' => 'required|string|min:10',
            'notify_host' => 'boolean',
        ]);

        $log = DB::transaction(function () use ($workspace, $validated) {
            return VisitorLog::create([
                'workspace_id' => $workspace->id,
                'kiosk_id' => $validated['kiosk_id'] ?? null,
                'visitor_type' => $validated['visitor_type'],
                'full_name' => $validated['full_name'],
                'company' => $validated['company'],
                'id_number' => $validated['id_number'] ?? null,
                'vehicle_reg' => $validated['vehicle_reg'] ?? null,
                'host_name' => $validated['host_name'],
                'host_contact' => $validated['host_contact'] ?? null,
                'purpose' => $validated['purpose'],
                'signed_in_at' => Carbon::now(),
            ]);
        });

        if ($validated['notify_host'] ?? false) {
            try {
                $hostUser = User::where('workspace_id', $workspace->id)
                    ->where('name', $validated['host_name'])
                    ->first();

                if ($hostUser !== null) {
                    $hostUser->notify(new VisitorArrivedNotification(
                        visitorName: $validated['full_name'],
                        visitorCompany: $validated['company'],
                        visitorType: $validated['visitor_type'],
                        hostName: $validated['host_name'],
                        signedInAt: $log->signed_in_at->format('H:i'),
                    ));

                    $log->updateQuietly([
                        'host_notified' => true,
                        'host_notified_at' => Carbon::now(),
                        'host_user_id' => $hostUser->id,
                    ]);
                }
            } catch (\Throwable) {
                // Fire-and-forget: SMS failure does not block sign-in
            }
        }

        return response()->json(['data' => $log], 201);
    }

    public function signOut(Request $request, string $workspaceId, VisitorLog $visitor): JsonResponse
    {
        $workspace = Workspace::findOrFail($workspaceId);

        if ($visitor->workspace_id !== $workspace->id) {
            return response()->json(['message' => 'Visitor log not found in this workspace.'], 404);
        }

        if ($visitor->signed_out_at !== null) {
            return response()->json(['message' => 'Visitor is already signed out.'], 409);
        }

        $visitor->update(['signed_out_at' => Carbon::now()]);

        return response()->json(['data' => $visitor]);
    }

    public function index(Request $request, string $workspaceId): JsonResponse
    {
        Workspace::findOrFail($workspaceId);

        $query = VisitorLog::where('workspace_id', $workspaceId);

        if ($request->filled('type')) {
            $query->where('visitor_type', $request->type);
        }

        if ($request->filled('signed_in')) {
            $query->whereDate('signed_in_at', $request->signed_in);
        }

        if ($request->boolean('signed_out') === true) {
            $query->whereNotNull('signed_out_at');
        } elseif ($request->boolean('signed_out') === false) {
            $query->whereNull('signed_out_at');
        }

        if ($request->filled('date')) {
            $query->whereDate('signed_in_at', $request->date);
        }

        $logs = $query->orderBy('signed_in_at', 'desc')
            ->paginate((int) $request->input('per_page', 50));

        return response()->json($logs);
    }

    public function active(Request $request, string $workspaceId): JsonResponse
    {
        Workspace::findOrFail($workspaceId);

        $log = VisitorLog::where('workspace_id', $workspaceId)
            ->whereNull('signed_out_at')
            ->orderBy('signed_in_at', 'desc')
            ->first();

        return response()->json(['data' => $log]);
    }

    public function markBadgePrinted(Request $request, string $workspaceId, VisitorLog $visitor): JsonResponse
    {
        $workspace = Workspace::findOrFail($workspaceId);

        if ($visitor->workspace_id !== $workspace->id) {
            return response()->json(['message' => 'Visitor log not found in this workspace.'], 404);
        }

        $visitor->update([
            'badge_printed' => true,
            'badge_printed_at' => Carbon::now(),
        ]);

        return response()->json(['data' => $visitor]);
    }
}
