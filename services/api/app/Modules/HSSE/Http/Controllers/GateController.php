<?php

namespace App\Modules\HSSE\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Services\FatigueService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GateController extends Controller
{
    public function scan(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $validated = $request->validate([
            'badge_id' => 'required|string|max:255',
        ]);

        $member = DB::table('workspace_members')
            ->join('users', 'workspace_members.user_id', '=', 'users.id')
            ->where('workspace_members.workspace_id', $workspace->id)
            ->where('workspace_members.badge_id', $validated['badge_id'])
            ->where('workspace_members.status', 'active')
            ->select(
                'users.id',
                'users.name',
                'users.avatar_url',
                'workspace_members.badge_id',
                'workspace_members.role',
            )
            ->first();

        if (!$member) {
            return response()->json(['data' => [
                'status' => 'not_found',
                'worker' => null,
                'non_compliance_reasons' => ['No active worker found with this badge ID'],
                'scanned_at' => now()->toIso8601String(),
            ]]);
        }

        $nonCompliance = [];

        $fatigue = app(FatigueService::class)->check($member->id, $workspace->id);
        if ($fatigue->hard_blocked) {
            $nonCompliance[] = 'Worker exceeds maximum shift hours (hard fatigue block)';
        } elseif ($fatigue->soft_blocked) {
            $nonCompliance[] = 'Worker approaching shift hour limits (fatigue warning)';
        }

        $expiredCerts = DB::table('competency_records')
            ->where('user_id', $member->id)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->count();

        if ($expiredCerts > 0) {
            $nonCompliance[] = "{$expiredCerts} expired certification(s) on record";
        }

        $status = match (true) {
            !empty($nonCompliance) => 'flagged',
            default => 'clear',
        };

        return response()->json(['data' => [
            'status' => $status,
            'worker' => [
                'id' => $member->id,
                'name' => $member->name,
                'badge_id' => $member->badge_id,
                'avatar_url' => $member->avatar_url,
            ],
            'non_compliance_reasons' => $nonCompliance,
            'scanned_at' => now()->toIso8601String(),
        ]]);
    }

    public function scanEquipment(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $validated = $request->validate([
            'registration_number' => 'required|string|max:255',
        ]);

        $equipment = DB::table('equipment')
            ->where('workspace_id', $workspace->id)
            ->where('registration_number', $validated['registration_number'])
            ->select('id', 'name', 'registration_number', 'equipment_type', 'status')
            ->first();

        if (!$equipment) {
            return response()->json(['data' => [
                'status' => 'not_found',
                'equipment' => null,
                'non_compliance_reasons' => ['No equipment found with this registration number'],
                'scanned_at' => now()->toIso8601String(),
            ]]);
        }

        $nonCompliance = [];

        $expiredCerts = DB::table('equipment_cert_records')
            ->where('workspace_id', $workspace->id)
            ->where('equipment_id', $equipment->id)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->count();

        if ($expiredCerts > 0) {
            $nonCompliance[] = "{$expiredCerts} expired certificate(s) for this equipment";
        }

        $expiringSoon = DB::table('equipment_cert_records')
            ->where('workspace_id', $workspace->id)
            ->where('equipment_id', $equipment->id)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->count();

        if ($expiringSoon > 0 && empty($nonCompliance)) {
            $nonCompliance[] = "{$expiringSoon} certificate(s) expiring within 30 days";
        }

        if ($equipment->status === 'decommissioned' || $equipment->status === 'out_of_service') {
            $nonCompliance[] = "Equipment is {$equipment->status}";
        }

        $status = match (true) {
            !empty($nonCompliance) => 'flagged',
            default => 'clear',
        };

        return response()->json(['data' => [
            'status' => $status,
            'equipment' => [
                'id' => $equipment->id,
                'name' => $equipment->name,
                'registration_number' => $equipment->registration_number,
                'equipment_type' => $equipment->equipment_type,
            ],
            'non_compliance_reasons' => $nonCompliance,
            'scanned_at' => now()->toIso8601String(),
        ]]);
    }
}
