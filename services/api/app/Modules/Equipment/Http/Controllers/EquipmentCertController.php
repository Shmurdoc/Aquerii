<?php

namespace App\Modules\Equipment\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Modules\Equipment\Models\EquipmentCertRecord;
use App\Modules\Equipment\Models\EquipmentCertType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EquipmentCertController extends Controller
{
    public function certTypes(Request $request, string $workspace): JsonResponse
    {
        $types = EquipmentCertType::where('workspace_id', $workspace)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $types]);
    }

    public function certs(Request $request, string $workspace, string $id): JsonResponse
    {
        $records = EquipmentCertRecord::where('workspace_id', $workspace)
            ->where('equipment_id', $id)
            ->with('certType:id,name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($record) {
                return [
                    'id' => $record->id,
                    'equipment_id' => $record->equipment_id,
                    'cert_type_id' => $record->cert_type_id,
                    'cert_type_name' => $record->certType?->name,
                    'cert_number' => $record->cert_number,
                    'issued_at' => $record->issued_at?->toIso8601String(),
                    'expires_at' => $record->expires_at?->toIso8601String(),
                    'status' => $record->status,
                    'verified' => $record->verified,
                    'verified_at' => $record->verified_at?->toIso8601String(),
                    'verified_by' => $record->verified_by,
                    'file_url' => $record->file_url,
                    'notes' => $record->notes,
                ];
            });

        return response()->json(['data' => $records]);
    }

    public function createCert(Request $request, string $workspace, string $id): JsonResponse
    {
        $validated = $request->validate([
            'cert_type_id' => 'required|uuid|exists:equipment_cert_types,id',
            'cert_number' => 'required|string|max:255',
            'issued_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:issued_at',
            'file' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $type = EquipmentCertType::where('id', $validated['cert_type_id'])
            ->where('workspace_id', $workspace)
            ->firstOrFail();

        $status = $this->computeStatus($validated['issued_at'] ?? null, $validated['expires_at'] ?? null);

        $record = DB::transaction(function () use ($validated, $workspace, $id, $status, $request) {
            return EquipmentCertRecord::create([
                'workspace_id' => $workspace,
                'equipment_id' => $id,
                'cert_type_id' => $validated['cert_type_id'],
                'cert_number' => $validated['cert_number'],
                'issued_at' => $validated['issued_at'] ?? null,
                'expires_at' => $validated['expires_at'] ?? null,
                'status' => $status,
                'file_url' => $validated['file'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);
        });

        return response()->json(['data' => $record], 201);
    }

    public function verifyCert(Request $request, string $workspace, string $id, string $certId): JsonResponse
    {
        $record = EquipmentCertRecord::where('id', $certId)
            ->where('workspace_id', $workspace)
            ->where('equipment_id', $id)
            ->firstOrFail();

        $record->update([
            'verified' => true,
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $record->fresh()]);
    }

    public function compliance(Request $request, string $workspace, string $id): JsonResponse
    {
        $types = EquipmentCertType::where('workspace_id', $workspace)->get();
        $records = EquipmentCertRecord::where('workspace_id', $workspace)
            ->where('equipment_id', $id)
            ->get()
            ->keyBy('cert_type_id');

        $breakdown = $types->map(function ($type) use ($records) {
            $record = $records->get($type->id);

            return [
                'cert_type_id' => $type->id,
                'cert_type_name' => $type->name,
                'status' => $record ? $this->recomputeStatus($record) : 'missing',
                'cert_id' => $record?->id,
                'issued_at' => $record?->issued_at?->toIso8601String(),
                'expires_at' => $record?->expires_at?->toIso8601String(),
            ];
        });

        $summary = [
            'valid' => $breakdown->where('status', 'valid')->count(),
            'expiring_soon' => $breakdown->where('status', 'expiring_soon')->count(),
            'expired' => $breakdown->where('status', 'expired')->count(),
            'missing' => $breakdown->where('status', 'missing')->count(),
            'total' => $breakdown->count(),
        ];

        $hasNonCompliant = $breakdown->contains(fn ($c) => in_array($c['status'], ['expired', 'missing'], true));

        return response()->json([
            'data' => [
                'equipment_id' => $id,
                'overall_status' => $hasNonCompliant ? 'non_compliant' : 'compliant',
                'cert_summary' => $summary,
                'breakdown' => $breakdown->values(),
            ],
        ]);
    }

    public function summary(Request $request, string $workspace): JsonResponse
    {
        $equipmentIds = EquipmentCertRecord::where('workspace_id', $workspace)
            ->distinct('equipment_id')
            ->pluck('equipment_id');

        $total = $equipmentIds->count();
        $compliant = 0;
        $nonCompliant = 0;
        $expiringSoon = 0;

        foreach ($equipmentIds as $eqId) {
            $records = EquipmentCertRecord::where('workspace_id', $workspace)
                ->where('equipment_id', $eqId)
                ->get();

            $hasExpiredOrMissing = false;
            $hasExpiring = false;

            $types = EquipmentCertType::where('workspace_id', $workspace)->pluck('id');

            foreach ($types as $typeId) {
                $record = $records->where('cert_type_id', $typeId)->first();
                $status = $record ? $this->recomputeStatus($record) : 'missing';

                if ($status === 'expired' || $status === 'missing') {
                    $hasExpiredOrMissing = true;
                }
                if ($status === 'expiring_soon') {
                    $hasExpiring = true;
                }
            }

            if ($hasExpiring) {
                $expiringSoon++;
            }
            if ($hasExpiredOrMissing) {
                $nonCompliant++;
            } else {
                $compliant++;
            }
        }

        return response()->json([
            'data' => [
                'total' => $total,
                'compliant' => $compliant,
                'non_compliant' => $nonCompliant,
                'expiring_soon' => $expiringSoon,
                'suspended' => 0,
            ],
        ]);
    }

    private function computeStatus(?string $issuedAt, ?string $expiresAt): string
    {
        if (!$issuedAt && !$expiresAt) {
            return 'valid';
        }

        $now = now();
        $expires = $expiresAt ? now()->parse($expiresAt) : null;

        if (!$expires) {
            return 'valid';
        }

        if ($expires->isPast()) {
            return 'expired';
        }

        if ($expires->diffInDays($now) <= 30) {
            return 'expiring_soon';
        }

        return 'valid';
    }

    private function recomputeStatus(EquipmentCertRecord $record): string
    {
        if (!$record->expires_at) {
            return 'valid';
        }

        $now = now();

        if ($record->expires_at->isPast()) {
            return 'expired';
        }

        if ($record->expires_at->diffInDays($now) <= 30) {
            return 'expiring_soon';
        }

        return 'valid';
    }
}
