<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\CompetencyRequirement;
use App\Modules\Competency\Models\CompetencyType;
use App\Modules\CRM\Models\CrmCompany;
use App\Services\ComplianceService;
use Carbon\Carbon;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'status' => 'active',
    ]);
    Sanctum::actingAs($this->user);
});

// ===== ComplianceService: calculateWorkerStatus =====

it('returns compliant when all checks pass', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
    ]);

    $inductionType = CompetencyType::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Site Induction',
        'category' => 'induction',
    ]);
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);

    $status = app(ComplianceService::class)->calculateWorkerStatus($worker);

    expect($status)->toBe('compliant');
});

it('returns suspended when worker status is suspended', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'suspended',
    ]);

    $status = app(ComplianceService::class)->calculateWorkerStatus($worker);

    expect($status)->toBe('suspended');
});

it('returns non_compliant when no valid COF record exists', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
    ]);

    $inductionType = CompetencyType::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Site Induction',
    ]);
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);

    $status = app(ComplianceService::class)->calculateWorkerStatus($worker);

    expect($status)->toBe('non_compliant');
});

it('returns non_compliant when COF record is expired', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'status' => 'expired',
        'expires_at' => Carbon::now()->subMonth(),
    ]);

    $status = app(ComplianceService::class)->calculateWorkerStatus($worker);

    expect($status)->toBe('non_compliant');
});

it('returns non_compliant when no site induction found', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
    ]);

    $status = app(ComplianceService::class)->calculateWorkerStatus($worker);

    expect($status)->toBe('non_compliant');
});

it('returns non_compliant when site induction is expired', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
    ]);

    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'competency_type_id' => CompetencyType::factory()->create([
            'workspace_id' => $this->workspace->id,
            'name' => 'Site Induction',
        ])->id,
        'status' => 'expired',
        'expires_at' => Carbon::now()->subMonth(),
        'verified_at' => Carbon::now(),
    ]);

    $status = app(ComplianceService::class)->calculateWorkerStatus($worker);

    expect($status)->toBe('non_compliant');
});

it('returns non_compliant when mandatory certification is missing', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
    ]);

    $inductionType = CompetencyType::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Site Induction',
    ]);
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);

    $blastingType = CompetencyType::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Blasting License',
    ]);
    CompetencyRequirement::factory()->create([
        'workspace_id' => $this->workspace->id,
        'competency_type_id' => $blastingType->id,
        'is_mandatory' => true,
        'requirable_type' => 'workspace',
        'requirable_id' => $this->workspace->id,
    ]);

    $status = app(ComplianceService::class)->calculateWorkerStatus($worker);

    expect($status)->toBe('non_compliant');
});

it('returns expiring_soon when COF expires within 30 days', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addDays(15),
    ]);

    $inductionType = CompetencyType::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Site Induction',
    ]);
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);

    $status = app(ComplianceService::class)->calculateWorkerStatus($worker);

    expect($status)->toBe('expiring_soon');
});

it('returns non_compliant when company is soft-deleted', function () {
    $company = CrmCompany::factory()->create(['workspace_id' => $this->workspace->id]);
    $company->delete();

    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
        'company_id' => $company->id,
    ]);

    $status = app(ComplianceService::class)->calculateWorkerStatus($worker);

    expect($status)->toBe('non_compliant');
});

it('returns compliant when worker has no company', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
        'company_id' => null,
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
    ]);

    $inductionType = CompetencyType::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Site Induction',
    ]);
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);

    $status = app(ComplianceService::class)->calculateWorkerStatus($worker);

    expect($status)->toBe('compliant');
});

// ===== ComplianceService: getExpiringCertifications =====

it('returns expiring certifications', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addDays(20),
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addDays(60),
    ]);

    $expiring = app(ComplianceService::class)->getExpiringCertifications(30);

    expect($expiring)->toHaveCount(1);
    expect($expiring->first()['type'])->toBe('cof');
});

// ===== ComplianceService: getNonCompliantWorkers =====

it('returns only non-compliant workers', function () {
    $compliantWorker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
    ]);
    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $compliantWorker->user_id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
    ]);
    $inductionType = CompetencyType::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Site Induction',
    ]);
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $compliantWorker->user_id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);

    $nonCompliantWorker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
    ]);
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);

    $nonCompliant = app(ComplianceService::class)->getNonCompliantWorkers($this->workspace);

    expect($nonCompliant)->toHaveCount(1);
    expect($nonCompliant->first()->id)->toBe($nonCompliantWorker->id);
});

// ===== WorkspaceMember computed attribute =====

it('computes overall_compliance_status on WorkspaceMember', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'suspended',
    ]);

    expect($worker->overall_compliance_status)->toBe('suspended');
});

// ===== Compliance API endpoints =====

it('returns compliance data via API', function () {
    $worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create()->id,
        'status' => 'active',
    ]);

    $inductionType = CompetencyType::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Site Induction',
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
    ]);
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->user_id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);

    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
    ]);
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/compliance");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'summary' => ['total_workers', 'compliant', 'non_compliant', 'suspended', 'compliance_rate'],
                'workers',
            ],
        ]);
});

it('returns dashboard data via API', function () {
    $inductionType = CompetencyType::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Site Induction',
    ]);
    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
    ]);
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/compliance/dashboard");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'worker_summary' => ['total', 'compliant', 'expiring_soon', 'non_compliant', 'suspended', 'compliance_rate'],
                'certification_summary',
                'induction_summary',
                'requirements',
            ],
        ]);
});
