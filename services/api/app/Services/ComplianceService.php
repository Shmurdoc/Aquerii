<?php

namespace App\Services;

use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\CompetencyRequirement;
use App\Modules\Competency\Models\CompetencyType;
use App\Modules\Competency\Models\TrainingRecord;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\EquipmentCertType;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ComplianceService
{
    public function calculateWorkerStatus(WorkspaceMember $worker): string
    {
        if ($worker->status === 'suspended') {
            return 'suspended';
        }

        if ($worker->company_id !== null) {
            $company = $worker->company;
            if ($company === null || $company->trashed()) {
                return 'non_compliant';
            }
        }

        $now = Carbon::now();
        $thirtyDays = $now->copy()->addDays(30);

        $cof = CofRecord::where('workspace_id', $worker->workspace_id)
            ->where('user_id', $worker->user_id)
            ->where('status', 'active')
            ->whereNotNull('verified_at')
            ->where('expires_at', '>', $now)
            ->orderByDesc('expires_at')
            ->first();

        if ($cof === null) {
            return 'non_compliant';
        }

        $hasValidInduction = $this->checkSiteInduction($worker);
        $hasRequiredCerts = $this->checkRequiredCertifications($worker);

        if (! $hasValidInduction || ! $hasRequiredCerts) {
            return 'non_compliant';
        }

        $expiringCof = CofRecord::where('workspace_id', $worker->workspace_id)
            ->where('user_id', $worker->user_id)
            ->where('status', 'active')
            ->where('expires_at', '<=', $thirtyDays)
            ->where('expires_at', '>', $now)
            ->exists();

        if ($expiringCof) {
            return 'expiring_soon';
        }

        $expiringCert = CompetencyRecord::where('workspace_id', $worker->workspace_id)
            ->where('user_id', $worker->user_id)
            ->where('status', 'active')
            ->where('expires_at', '<=', $thirtyDays)
            ->where('expires_at', '>', $now)
            ->exists();

        if ($expiringCert) {
            return 'expiring_soon';
        }

        $expiredCert = CompetencyRecord::where('workspace_id', $worker->workspace_id)
            ->where('user_id', $worker->user_id)
            ->where('status', 'active')
            ->where('expires_at', '<=', $now)
            ->exists();

        if ($expiredCert) {
            return 'non_compliant';
        }

        $expiringInduction = TrainingRecord::where('workspace_id', $worker->workspace_id)
            ->where('user_id', $worker->user_id)
            ->where('training_name', 'ilike', '%induction%')
            ->where('expiry_date', '<=', $thirtyDays)
            ->where('expiry_date', '>', $now)
            ->exists();

        if ($expiringInduction) {
            return 'expiring_soon';
        }

        return 'compliant';
    }

    public function getWorkerComplianceFailures(WorkspaceMember $worker): array
    {
        $failures = [];

        if ($worker->status === 'suspended') {
            $failures[] = 'worker is suspended';
        }

        if ($worker->company_id !== null) {
            $company = $worker->company;
            if ($company === null || $company->trashed()) {
                $failures[] = 'company not active';
            }
        }

        $now = Carbon::now();
        $cof = CofRecord::where('workspace_id', $worker->workspace_id)
            ->where('user_id', $worker->user_id)
            ->where('status', 'active')
            ->whereNotNull('verified_at')
            ->where('expires_at', '>', $now)
            ->orderByDesc('expires_at')
            ->first();

        if ($cof === null) {
            $failures[] = 'medical fitness expired or not verified';
        }

        if (! $this->checkSiteInduction($worker)) {
            $failures[] = 'missing site induction';
        }

        if (! $this->checkRequiredCertifications($worker)) {
            $failures[] = 'missing required certifications';
        }

        $expiredCompetency = CompetencyRecord::where('workspace_id', $worker->workspace_id)
            ->where('user_id', $worker->user_id)
            ->where('status', 'active')
            ->where('expires_at', '<=', $now)
            ->with('competencyType')
            ->first();

        if ($expiredCompetency) {
            $name = $expiredCompetency->competencyType?->name ?? 'Competency';
            $failures[] = strtolower($name).' expired '.$expiredCompetency->expires_at->toDateString();
        }

        return $failures;
    }

    public function getExpiringCertifications(int $days): Collection
    {
        $now = Carbon::now();
        $cutoff = $now->copy()->addDays($days);

        $cofs = CofRecord::where('status', 'active')
            ->where('expires_at', '<=', $cutoff)
            ->where('expires_at', '>', $now)
            ->with(['user', 'workspace'])
            ->get()
            ->map(fn (CofRecord $r) => [
                'type' => 'cof',
                'id' => $r->id,
                'user_id' => $r->user_id,
                'workspace_id' => $r->workspace_id,
                'expires_at' => $r->expires_at,
                'record' => $r,
            ]);

        $certs = CompetencyRecord::where('status', 'active')
            ->where('expires_at', '<=', $cutoff)
            ->where('expires_at', '>', $now)
            ->with(['user', 'workspace', 'competencyType'])
            ->get()
            ->map(fn (CompetencyRecord $r) => [
                'type' => 'competency',
                'id' => $r->id,
                'user_id' => $r->user_id,
                'workspace_id' => $r->workspace_id,
                'expires_at' => $r->expires_at,
                'record' => $r,
            ]);

        $trainings = TrainingRecord::where('expiry_date', '<=', $cutoff)
            ->where('expiry_date', '>', $now)
            ->with(['user', 'workspace', 'competencyType'])
            ->get()
            ->map(fn (TrainingRecord $r) => [
                'type' => 'training',
                'id' => $r->id,
                'user_id' => $r->user_id,
                'workspace_id' => $r->workspace_id,
                'expires_at' => $r->expiry_date,
                'record' => $r,
            ]);

        return $cofs->concat($certs)->concat($trainings)->values();
    }

    public function getNonCompliantWorkers(Workspace $workspace): Collection
    {
        $now = Carbon::now();
        $thirtyDays = $now->copy()->addDays(30);
        $twelveMonthsAgo = $now->copy()->subMonths(12);

        $members = $workspace->members()
            ->with(['company', 'user'])
            ->get();

        $userIds = $members->pluck('user_id');

        // Batch 1: All active+verified COF records for every member
        $cofByUser = CofRecord::where('workspace_id', $workspace->id)
            ->whereIn('user_id', $userIds)
            ->where('status', 'active')
            ->whereNotNull('verified_at')
            ->where('expires_at', '>', $now)
            ->orderByDesc('expires_at')
            ->get()
            ->groupBy('user_id');

        // Batch 2: Induction competency type IDs
        $inductionTypeIds = CompetencyType::where('workspace_id', $workspace->id)
            ->where('name', 'ilike', '%induction%')
            ->pluck('id');

        // Batch 3: Induction competency records (active, not expired)
        $inductionCertsByUser = CompetencyRecord::where('workspace_id', $workspace->id)
            ->whereIn('user_id', $userIds)
            ->where('status', 'active')
            ->whereIn('competency_type_id', $inductionTypeIds)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', $now))
            ->get()
            ->groupBy('user_id');

        // Batch 4: Induction training records (completed within 12 months)
        $inductionTrainingsByUser = TrainingRecord::where('workspace_id', $workspace->id)
            ->whereIn('user_id', $userIds)
            ->where('training_name', 'ilike', '%induction%')
            ->where('date_completed', '>=', $twelveMonthsAgo)
            ->get()
            ->groupBy('user_id');

        // Batch 5: Mandatory competency requirement IDs
        $mandatoryTypeIds = CompetencyRequirement::where('workspace_id', $workspace->id)
            ->where('is_mandatory', true)
            ->pluck('competency_type_id');

        // Batch 6: Valid mandatory competency records (active, not expired, verified)
        $validMandatoryByUser = collect();
        if ($mandatoryTypeIds->isNotEmpty()) {
            $validMandatoryByUser = CompetencyRecord::where('workspace_id', $workspace->id)
                ->whereIn('user_id', $userIds)
                ->where('status', 'active')
                ->whereIn('competency_type_id', $mandatoryTypeIds)
                ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', $now))
                ->whereNotNull('verified_at')
                ->get()
                ->groupBy('user_id');
        }

        $nonCompliant = [];

        foreach ($members as $worker) {
            if ($worker->status === 'suspended') {
                continue;
            }

            if ($worker->company_id !== null) {
                $company = $worker->company;
                if ($company === null || $company->trashed()) {
                    $nonCompliant[] = $worker;

                    continue;
                }
            }

            // COF check: must have active + verified + not expired
            $workerCofs = $cofByUser->get($worker->user_id);
            if ($workerCofs === null || $workerCofs->isEmpty()) {
                $nonCompliant[] = $worker;

                continue;
            }

            // Induction check
            $hasInductionCert = $inductionCertsByUser->has($worker->user_id);
            $hasInductionTraining = $inductionTrainingsByUser->has($worker->user_id);
            if (! $hasInductionCert && ! $hasInductionTraining) {
                $nonCompliant[] = $worker;

                continue;
            }

            // Mandatory certifications check
            if ($mandatoryTypeIds->isNotEmpty()) {
                $workerValid = collect($validMandatoryByUser->get($worker->user_id, []))
                    ->pluck('competency_type_id');
                $missing = $mandatoryTypeIds->diff($workerValid);
                if ($missing->isNotEmpty()) {
                    $nonCompliant[] = $worker;

                    continue;
                }
            }
        }

        return collect($nonCompliant);
    }

    public function getEquipmentComplianceStatus(Equipment $equipment): string
    {
        if (! in_array($equipment->status, ['active', 'operational'])) {
            return 'suspended';
        }

        $now = Carbon::now();
        $thirtyDays = $now->copy()->addDays(30);

        $mandatoryTypes = EquipmentCertType::where('workspace_id', $equipment->workspace_id)
            ->where('is_mandatory', true)
            ->get();

        $worst = 'compliant';

        foreach ($mandatoryTypes as $certType) {
            $latest = $equipment->certRecords()
                ->where('equipment_cert_type_id', $certType->id)
                ->orderByDesc('expires_at')
                ->first();

            if ($latest === null) {
                $worst = $this->worsenStatus($worst, 'non_compliant');

                continue;
            }

            if ($latest->verified_at === null) {
                $worst = $this->worsenStatus($worst, 'non_compliant');

                continue;
            }

            if ($latest->expires_at === null) {
                continue;
            }

            if ($latest->expires_at < $now) {
                $worst = $this->worsenStatus($worst, 'non_compliant');

                continue;
            }

            if ($latest->expires_at <= $thirtyDays) {
                $worst = $this->worsenStatus($worst, 'expiring_soon');
            }
        }

        return $worst;
    }

    public function getEquipmentComplianceFailures(Equipment $equipment): array
    {
        $failures = [];

        if (! in_array($equipment->status, ['active', 'operational'])) {
            $failures[] = 'equipment status is '.$equipment->status;
        }

        $now = Carbon::now();
        $mandatoryTypes = EquipmentCertType::where('workspace_id', $equipment->workspace_id)
            ->where('is_mandatory', true)
            ->get();

        foreach ($mandatoryTypes as $certType) {
            $latest = $equipment->certRecords()
                ->where('equipment_cert_type_id', $certType->id)
                ->orderByDesc('expires_at')
                ->first();

            if ($latest === null) {
                $failures[] = $certType->name.' — no record found';

                continue;
            }

            if ($latest->verified_at === null) {
                $failures[] = $certType->name.' — not yet verified by HSSE (issued '.$latest->issued_at?->toDateString().')';

                continue;
            }

            if ($latest->expires_at !== null && $latest->expires_at < $now) {
                $failures[] = $certType->name.' — expired '.$latest->expires_at->toDateString();

                continue;
            }

            if ($latest->expires_at !== null && $latest->expires_at <= $now->copy()->addDays(30)) {
                $failures[] = $certType->name.' — expiring '.$latest->expires_at->toDateString();
            }
        }

        return $failures;
    }

    private function worsenStatus(string $current, string $candidate): string
    {
        $order = ['compliant' => 0, 'expiring_soon' => 1, 'non_compliant' => 2, 'suspended' => 3];

        return ($order[$candidate] ?? 0) > ($order[$current] ?? 0) ? $candidate : $current;
    }

    private function checkSiteInduction(WorkspaceMember $worker): bool
    {
        $now = Carbon::now();
        $twelveMonthsAgo = $now->copy()->subMonths(12);

        $hasInductionType = CompetencyRecord::where('workspace_id', $worker->workspace_id)
            ->where('user_id', $worker->user_id)
            ->where('status', 'active')
            ->whereHas('competencyType', fn ($q) => $q->where('name', 'ilike', '%induction%'))
            ->where(function ($q) use ($now) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', $now);
            })
            ->exists();

        if ($hasInductionType) {
            return true;
        }

        return TrainingRecord::where('workspace_id', $worker->workspace_id)
            ->where('user_id', $worker->user_id)
            ->where('training_name', 'ilike', '%induction%')
            ->where('date_completed', '>=', $twelveMonthsAgo)
            ->exists();
    }

    private function checkRequiredCertifications(WorkspaceMember $worker): bool
    {
        $mandatoryTypes = CompetencyRequirement::where('workspace_id', $worker->workspace_id)
            ->where('is_mandatory', true)
            ->pluck('competency_type_id');

        if ($mandatoryTypes->isEmpty()) {
            return true;
        }

        $validCerts = CompetencyRecord::where('workspace_id', $worker->workspace_id)
            ->where('user_id', $worker->user_id)
            ->where('status', 'active')
            ->whereIn('competency_type_id', $mandatoryTypes)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', Carbon::now());
            })
            ->whereNotNull('verified_at')
            ->pluck('competency_type_id');

        $missing = $mandatoryTypes->diff($validCerts);

        return $missing->isEmpty();
    }
}
