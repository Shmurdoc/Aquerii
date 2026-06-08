<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\EquipmentCertType;
use App\Modules\Equipment\Models\EquipmentCertRecord;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class EquipmentComplianceController extends Controller
{
    public function show(string $workspace, string $equipment): JsonResponse
    {
        $equipment = Equipment::where('workspace_id', $workspace)->findOrFail($equipment);

        $certTypes = EquipmentCertType::orderBy('name')->get();

        $records = EquipmentCertRecord::where('equipment_id', $equipment->id)
            ->with('certType')
            ->get()
            ->keyBy('equipment_cert_type_id');

        $now = Carbon::now();

        $requirements = $certTypes->map(function ($certType) use ($records, $now) {
            $record = $records->get($certType->id);

            $status = 'missing';
            if ($record) {
                if ($record->verified_at && $record->expires_at && $record->expires_at->gt($now)) {
                    $status = 'compliant';
                } elseif ($record->expires_at && $record->expires_at->lte($now)) {
                    $status = 'expired';
                } elseif ($record->verified_at) {
                    $status = 'valid';
                } else {
                    $status = 'unverified';
                }
            }

            return [
                'cert_type' => [
                    'id' => $certType->id,
                    'name' => $certType->name,
                    'slug' => $certType->slug,
                    'is_mandatory' => $certType->is_mandatory,
                    'frequency_days' => $certType->frequency_days,
                ],
                'status' => $status,
                'record' => $record ? [
                    'id' => $record->id,
                    'cert_number' => $record->cert_number,
                    'issued_at' => $record->issued_at,
                    'expires_at' => $record->expires_at,
                    'verified_at' => $record->verified_at,
                    'verified_by' => $record->verified_by,
                ] : null,
            ];
        });

        $overallStatus = 'compliant';
        $hasMissing = false;
        $hasExpired = false;
        $hasUnverified = false;

        foreach ($requirements as $req) {
            if ($req['cert_type']['is_mandatory']) {
                if ($req['status'] === 'missing') {
                    $hasMissing = true;
                } elseif ($req['status'] === 'expired') {
                    $hasExpired = true;
                } elseif ($req['status'] === 'unverified') {
                    $hasUnverified = true;
                }
            }
        }

        if ($hasMissing || $hasExpired) {
            $overallStatus = 'non_compliant';
        } elseif ($hasUnverified) {
            $overallStatus = 'non_compliant';
        }

        $totalMandatory = $requirements->where('cert_type.is_mandatory', true)->count();
        $compliantMandatory = $requirements->where('cert_type.is_mandatory', true)->whereIn('status', ['compliant', 'valid'])->count();

        return response()->json([
            'data' => [
                'equipment_id' => $equipment->id,
                'equipment_name' => $equipment->name,
                'overall_status' => $overallStatus,
                'compliance_score' => $totalMandatory > 0 ? round(($compliantMandatory / $totalMandatory) * 100, 1) : 100.0,
                'requirements' => $requirements,
            ],
        ]);
    }
}
