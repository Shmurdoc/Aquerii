<?php

namespace App\Http\Controllers\Api;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Http\Controllers\Controller;
use App\Models\GateKiosk;
use App\Models\SiteAccessLog;
use App\Modules\Equipment\Models\Equipment;
use App\Services\ComplianceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GateController extends Controller
{
    public function scan(Request $request, string $workspaceId): JsonResponse
    {
        $workspace = Workspace::findOrFail($workspaceId);

        $validated = $request->validate([
            'worker_id' => 'required|string|uuid',
            'direction' => 'required|string|in:entry,exit',
            'method' => 'sometimes|string|in:qr_scan,id_scan,manual_override',
            'override_reason' => 'required_if:method,manual_override|nullable|string|max:1000',
        ]);

        $method = $validated['method'] ?? 'qr_scan';

        $worker = WorkspaceMember::where('id', $validated['worker_id'])
            ->where('workspace_id', $workspace->id)
            ->firstOrFail();

        $compliance = $this->computeComplianceSnapshot($worker);

        $overrideByUserId = null;
        if ($method === 'manual_override' && $request->user() instanceof User) {
            $overrideByUserId = $request->user()->id;
        }

        SiteAccessLog::create([
            'id' => Str::uuid()->toString(),
            'workspace_id' => $workspace->id,
            'worker_id' => $worker->id,
            'direction' => $validated['direction'],
            'timestamp' => now(),
            'method' => $method,
            'compliance_snapshot' => $compliance,
            'override_reason' => $validated['override_reason'] ?? null,
            'override_by_user_id' => $overrideByUserId,
        ]);

        $status = $compliance['is_compliant'] ? 'compliant' : 'non_compliant';

        return response()->json([
            'status' => $status,
            'worker' => [
                'name' => $worker->user?->name ?? 'Unknown',
                'photo_url' => $worker->user?->avatar_url,
            ],
            'compliance' => [
                'status' => $compliance['status'],
                'failures' => $compliance['failures'],
                'checked_at' => $compliance['checked_at'],
            ],
        ]);
    }

    public function logs(Request $request, string $workspaceId): JsonResponse
    {
        Workspace::findOrFail($workspaceId);

        $query = SiteAccessLog::where('workspace_id', $workspaceId);

        if ($request->filled('date_from')) {
            $query->where('timestamp', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('timestamp', '<=', $request->date_to);
        }

        if ($request->filled('direction')) {
            $query->where('direction', $request->direction);
        }

        if ($request->filled('status')) {
            $isCompliant = $request->status === 'compliant';
            $query->whereRaw("compliance_snapshot->>'is_compliant' = ?", [$isCompliant ? 'true' : 'false']);
        }

        $logs = $query->with('worker.user')
            ->orderBy('timestamp', 'desc')
            ->paginate((int) $request->input('per_page', 50));

        return response()->json($logs);
    }

    public function stats(Request $request, string $workspaceId): JsonResponse
    {
        Workspace::findOrFail($workspaceId);
        $today = now()->startOfDay();

        $entries = SiteAccessLog::where('workspace_id', $workspaceId)
            ->where('timestamp', '>=', $today)
            ->where('direction', 'entry')
            ->count();

        $exits = SiteAccessLog::where('workspace_id', $workspaceId)
            ->where('timestamp', '>=', $today)
            ->where('direction', 'exit')
            ->count();

        $nonCompliant = SiteAccessLog::where('workspace_id', $workspaceId)
            ->where('timestamp', '>=', $today)
            ->whereRaw("compliance_snapshot->>'is_compliant' = ?", ['false'])
            ->count();

        $total = $entries + $exits;
        $complianceRate = $total > 0
            ? round((($total - $nonCompliant) / $total) * 100, 2)
            : 100.0;

        return response()->json([
            'data' => [
                'entries' => $entries,
                'exits' => $exits,
                'non_compliant_attempts' => $nonCompliant,
                'compliance_rate' => $complianceRate,
            ],
        ]);
    }

    public function kioskTokens(Request $request, string $workspaceId): JsonResponse
    {
        Workspace::findOrFail($workspaceId);

        $kiosks = GateKiosk::where('workspace_id', $workspaceId)
            ->orderBy('name')
            ->get(['id', 'workspace_id', 'name', 'allowed_sites', 'last_used_at', 'rotated_at', 'created_at']);

        return response()->json(['data' => $kiosks]);
    }

    public function scanEquipment(Request $request, string $workspaceId): JsonResponse
    {
        $workspace = Workspace::findOrFail($workspaceId);

        $validated = $request->validate([
            'registration_number' => 'required|string',
            'direction' => 'required|string|in:entry,exit',
            'method' => 'sometimes|string|in:qr_scan,id_scan,manual_override',
            'override_reason' => 'required_if:method,manual_override|nullable|string|max:1000',
        ]);

        $method = $validated['method'] ?? 'qr_scan';

        $equipment = Equipment::where('workspace_id', $workspace->id)
            ->where(function ($q) use ($validated) {
                $q->where('registration_number', $validated['registration_number'])
                    ->orWhere('plant_number', $validated['registration_number']);
            })
            ->firstOrFail();

        $complianceService = app(ComplianceService::class);

        try {
            $status = $complianceService->getEquipmentComplianceStatus($equipment);
            $failures = $complianceService->getEquipmentComplianceFailures($equipment);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'compliance' => [
                    'status' => 'error',
                    'failures' => ['Compliance check failed: '.$e->getMessage()],
                    'checked_at' => now()->toIso8601String(),
                ],
            ], 500);
        }

        $compliance = [
            'is_compliant' => $status === 'compliant',
            'status' => $status,
            'failures' => $failures,
            'checked_at' => now()->toIso8601String(),
        ];

        SiteAccessLog::create([
            'id' => Str::uuid()->toString(),
            'workspace_id' => $workspace->id,
            'equipment_id' => $equipment->id,
            'direction' => $validated['direction'],
            'timestamp' => now(),
            'method' => 'equipment_scan',
            'compliance_snapshot' => $compliance,
            'override_reason' => $validated['override_reason'] ?? null,
        ]);

        $gateStatus = $compliance['is_compliant'] ? 'compliant' : 'non_compliant';

        return response()->json([
            'status' => $gateStatus,
            'equipment' => [
                'name' => $equipment->name,
                'plant_number' => $equipment->plant_number,
                'registration_number' => $equipment->registration_number,
            ],
            'compliance' => [
                'status' => $compliance['status'],
                'failures' => $compliance['failures'],
                'checked_at' => $compliance['checked_at'],
            ],
        ]);
    }

    private function computeComplianceSnapshot(WorkspaceMember $worker): array
    {
        $complianceService = app(ComplianceService::class);

        try {
            $status = $complianceService->calculateWorkerStatus($worker);
            $failures = $complianceService->getWorkerComplianceFailures($worker);
        } catch (\Throwable $e) {
            return [
                'is_compliant' => false,
                'status' => 'error',
                'failures' => ['Compliance check failed: '.$e->getMessage()],
                'checked_at' => now()->toIso8601String(),
            ];
        }

        return [
            'is_compliant' => $status === 'compliant',
            'status' => $status,
            'failures' => $failures,
            'checked_at' => now()->toIso8601String(),
        ];
    }
}
