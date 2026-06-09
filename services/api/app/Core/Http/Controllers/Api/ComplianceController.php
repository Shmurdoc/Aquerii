<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\CompetencyRequirement;
use App\Modules\Competency\Models\CompetencyType;
use App\Modules\Competency\Models\TrainingRecord;
use App\Modules\Equipment\Models\Equipment;
use App\Services\ComplianceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class ComplianceController extends Controller
{
    public function __construct(
        private readonly ComplianceService $complianceService
    ) {}

    public function index(Workspace $workspace): JsonResponse
    {
        $workers = $workspace->members()
            ->with(['user', 'company'])
            ->get()
            ->map(fn (WorkspaceMember $worker) => [
                'id' => $worker->id,
                'user_id' => $worker->user_id,
                'user' => $worker->user,
                'role' => $worker->role,
                'status' => $worker->status,
                'company' => $worker->company ? ['id' => $worker->company->id, 'name' => $worker->company->name] : null,
                'overall_compliance_status' => $worker->overall_compliance_status,
            ]);

        $summary = $this->buildSummary($workers);

        return response()->json([
            'data' => [
                'summary' => $summary,
                'workers' => $workers,
            ],
        ]);
    }

    public function dashboard(Workspace $workspace): JsonResponse
    {
        $now = Carbon::now();
        $thirtyDays = $now->copy()->addDays(30);
        $twelveMonthsAgo = $now->copy()->subMonths(12);

        $workerCount = $workspace->members()->count();

        $compliant = 0;
        $expiringSoon = 0;
        $nonCompliant = 0;
        $suspended = 0;

        $workspace->members()->with(['company', 'user'])->each(function (WorkspaceMember $worker) use (&$compliant, &$expiringSoon, &$nonCompliant, &$suspended) {
            $status = $worker->overall_compliance_status;
            match ($status) {
                'compliant' => $compliant++,
                'expiring_soon' => $expiringSoon++,
                'non_compliant' => $nonCompliant++,
                'suspended' => $suspended++,
                default => $nonCompliant++,
            };
        });

        $activeCofCount = CofRecord::where('workspace_id', $workspace->id)
            ->where('status', 'active')
            ->where('expires_at', '>', $now)
            ->count();

        $expiringCofCount = CofRecord::where('workspace_id', $workspace->id)
            ->where('status', 'active')
            ->where('expires_at', '<=', $thirtyDays)
            ->where('expires_at', '>', $now)
            ->count();

        $activeCertCount = CompetencyRecord::where('workspace_id', $workspace->id)
            ->where('status', 'active')
            ->where(function ($q) use ($now) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', $now);
            })
            ->count();

        $expiringCertCount = CompetencyRecord::where('workspace_id', $workspace->id)
            ->where('status', 'active')
            ->where('expires_at', '<=', $thirtyDays)
            ->where('expires_at', '>', $now)
            ->count();

        $recentInductions = TrainingRecord::where('workspace_id', $workspace->id)
            ->where('training_name', 'ilike', '%induction%')
            ->where('date_completed', '>=', $twelveMonthsAgo)
            ->count();

        $expiredInductions = TrainingRecord::where('workspace_id', $workspace->id)
            ->where('training_name', 'ilike', '%induction%')
            ->where(function ($q) use ($twelveMonthsAgo) {
                $q->where('date_completed', '<', $twelveMonthsAgo)
                    ->orWhere(function ($q2) {
                        $q2->whereNotNull('expiry_date')
                            ->where('expiry_date', '<', Carbon::now());
                    });
            })
            ->count();

        $mandatoryRequirementCount = CompetencyRequirement::where('workspace_id', $workspace->id)
            ->where('is_mandatory', true)
            ->count();

        $totalCompetencyTypes = CompetencyType::where('workspace_id', $workspace->id)->count();

        return response()->json([
            'data' => [
                'worker_summary' => [
                    'total' => $workerCount,
                    'compliant' => $compliant,
                    'expiring_soon' => $expiringSoon,
                    'non_compliant' => $nonCompliant,
                    'suspended' => $suspended,
                    'compliance_rate' => $workerCount > 0 ? round(($compliant / $workerCount) * 100, 1) : 0.0,
                ],
                'certification_summary' => [
                    'active_cofs' => $activeCofCount,
                    'expiring_cofs_30_days' => $expiringCofCount,
                    'active_certifications' => $activeCertCount,
                    'expiring_certifications_30_days' => $expiringCertCount,
                ],
                'induction_summary' => [
                    'valid_inductions' => $recentInductions,
                    'expired_inductions' => $expiredInductions,
                ],
                'requirements' => [
                    'mandatory_requirements' => $mandatoryRequirementCount,
                    'competency_types' => $totalCompetencyTypes,
                ],
            ],
        ]);
    }

    public function equipmentIndex(Workspace $workspace): JsonResponse
    {
        $equipment = $workspace->equipment()
            ->with(['category', 'certRecords.certType'])
            ->get()
            ->map(fn (Equipment $item) => [
                'id' => $item->id,
                'plant_number' => $item->plant_number,
                'registration_number' => $item->registration_number,
                'name' => $item->name,
                'make' => $item->make,
                'model' => $item->model,
                'category' => $item->category ? ['id' => $item->category->id, 'name' => $item->category->name] : null,
                'status' => $item->status,
                'overall_compliance_status' => $this->complianceService->getEquipmentComplianceStatus($item),
            ]);

        $summary = $this->buildEquipmentSummary($equipment);

        return response()->json([
            'data' => [
                'summary' => $summary,
                'equipment' => $equipment,
            ],
        ]);
    }

    public function equipmentShow(Workspace $workspace, Equipment $equipment): JsonResponse
    {
        if ($equipment->workspace_id !== $workspace->id) {
            return response()->json(['error' => 'Not found.'], 404);
        }

        $equipment->load(['category', 'certRecords.certType']);

        $status = $this->complianceService->getEquipmentComplianceStatus($equipment);
        $failures = $this->complianceService->getEquipmentComplianceFailures($equipment);

        $certBreakdown = $equipment->certRecords()
            ->with('certType')
            ->orderByDesc('expires_at')
            ->get()
            ->map(fn ($record) => [
                'id' => $record->id,
                'cert_type' => $record->certType?->name,
                'is_mandatory' => $record->certType?->is_mandatory ?? false,
                'issued_at' => $record->issued_at?->toIso8601String(),
                'expires_at' => $record->expires_at?->toIso8601String(),
                'verified_at' => $record->verified_at?->toIso8601String(),
                'status' => $record->status,
            ]);

        $totalCertTypes = $certTypes->count();
        $compliantCertTypes = $requirements->whereIn('status', ['compliant', 'valid'])->count();
        $complianceScore = $totalCertTypes > 0
            ? round(($compliantCertTypes / $totalCertTypes) * 100, 1)
            : 100.0;

        return response()->json([
            'data' => [
                'id' => $equipment->id,
                'plant_number' => $equipment->plant_number,
                'registration_number' => $equipment->registration_number,
                'name' => $equipment->name,
                'make' => $equipment->make,
                'model' => $equipment->model,
                'category' => $equipment->category ? ['id' => $equipment->category->id, 'name' => $equipment->category->name] : null,
                'status' => $equipment->status,
                'overall_compliance_status' => $status,
                'compliance_score' => $complianceScore,
                'failures' => $failures,
                'certificates' => $certBreakdown,
            ],
        ]);
    }

    private function buildEquipmentSummary($equipment): array
    {
        $total = $equipment->count();
        $compliant = $equipment->where('overall_compliance_status', 'compliant')->count();
        $expiringSoon = $equipment->where('overall_compliance_status', 'expiring_soon')->count();
        $nonCompliant = $equipment->where('overall_compliance_status', 'non_compliant')->count();
        $suspended = $equipment->where('overall_compliance_status', 'suspended')->count();

        return [
            'total_equipment' => $total,
            'compliant' => $compliant,
            'expiring_soon' => $expiringSoon,
            'non_compliant' => $nonCompliant,
            'suspended' => $suspended,
            'compliance_rate' => $total > 0 ? round(($compliant / $total) * 100, 1) : 0.0,
        ];
    }

    private function buildSummary($workers): array
    {
        $total = $workers->count();
        $compliant = $workers->where('overall_compliance_status', 'compliant')->count();
        $expiringSoon = $workers->where('overall_compliance_status', 'expiring_soon')->count();
        $nonCompliant = $workers->where('overall_compliance_status', 'non_compliant')->count();
        $suspended = $workers->where('overall_compliance_status', 'suspended')->count();

        return [
            'total_workers' => $total,
            'compliant' => $compliant,
            'expiring_soon' => $expiringSoon,
            'non_compliant' => $nonCompliant,
            'suspended' => $suspended,
            'compliance_rate' => $total > 0 ? round(($compliant / $total) * 100, 1) : 0.0,
        ];
    }
}
