<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\CompetencyType;
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

it('returns compliance data via API endpoint', function () {
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

it('returns compliance dashboard stats', function () {
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

it('shows worker as compliant when all certifications are valid', function () {
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

it('shows worker as non_compliant when certification is expired', function () {
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

it('shows worker as expiring_soon when certification expires within 30 days', function () {
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

    expect($status)->toBe('expiring_soon');
});

it('denies access to non-members on compliance endpoint', function () {
    $otherUser = User::factory()->create();
    Sanctum::actingAs($otherUser);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/compliance");

    $response->assertStatus(403);
});
