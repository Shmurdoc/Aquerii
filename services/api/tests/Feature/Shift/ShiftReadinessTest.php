<?php

use App\Core\Models\ShiftPlan;
use App\Core\Models\ShiftPlanAssignment;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Services\ComplianceService;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($this->user);
    $this->today = Carbon::today()->toDateString();
});

it('creates a shift plan with roles returning 201', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness/plans",
        [
            'date' => $this->today,
            'shift_type' => 'morning',
            'required_roles' => [
                ['role' => 'operator', 'count' => 3],
                ['role' => 'supervisor', 'count' => 1],
                ['role' => 'safety_officer', 'count' => 1],
            ],
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.shift_type', 'morning')
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonCount(3, 'data.required_roles');

    expect($response->json('data.date'))->toContain($this->today);
});

it('fails with 422 when required_roles is empty', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness/plans",
        [
            'date' => $this->today,
            'shift_type' => 'morning',
            'required_roles' => [],
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['required_roles']);
});

it('fails with 422 when shift_type is invalid', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness/plans",
        [
            'date' => $this->today,
            'shift_type' => 'invalid_shift',
            'required_roles' => [
                ['role' => 'operator', 'count' => 1],
            ],
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['shift_type']);
});

it('lists shift plans', function () {
    ShiftPlan::create([
        'workspace_id' => $this->workspace->id,
        'date' => $this->today,
        'shift_type' => 'morning',
        'required_roles' => [['role' => 'operator', 'count' => 2]],
        'status' => 'draft',
    ]);
    ShiftPlan::create([
        'workspace_id' => $this->workspace->id,
        'date' => $this->today,
        'shift_type' => 'night',
        'required_roles' => [['role' => 'operator', 'count' => 1]],
        'status' => 'draft',
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness/plans"
    );

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(2);
});

it('assigns a worker to a shift plan returning 201', function () {
    $worker = User::factory()->create();
    $member = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->id,
        'role' => 'member',
    ]);

    $plan = ShiftPlan::create([
        'workspace_id' => $this->workspace->id,
        'date' => $this->today,
        'shift_type' => 'morning',
        'required_roles' => [['role' => 'operator', 'count' => 2]],
        'status' => 'draft',
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness/plans/{$plan->id}/assign",
        [
            'worker_id' => $member->id,
            'role' => 'operator',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.role', 'operator')
        ->assertJsonPath('data.status', 'assigned');
});

it('publishes a shift plan returning 200', function () {
    $plan = ShiftPlan::create([
        'workspace_id' => $this->workspace->id,
        'date' => $this->today,
        'shift_type' => 'morning',
        'required_roles' => [['role' => 'operator', 'count' => 1]],
        'status' => 'draft',
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness/plans/{$plan->id}/publish",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'published');
});

it('completes a published shift plan returning 200', function () {
    $plan = ShiftPlan::create([
        'workspace_id' => $this->workspace->id,
        'date' => $this->today,
        'shift_type' => 'morning',
        'required_roles' => [['role' => 'operator', 'count' => 1]],
        'status' => 'published',
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness/plans/{$plan->id}/complete",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'completed');
});

it('gets readiness for a shift', function () {
    // Mock ComplianceService to return 'compliant' for test workers
    $complianceMock = Mockery::mock(ComplianceService::class);
    $complianceMock->shouldReceive('calculateWorkerStatus')->andReturn('compliant');
    $this->app->instance(ComplianceService::class, $complianceMock);

    $plan = ShiftPlan::create([
        'workspace_id' => $this->workspace->id,
        'date' => $this->today,
        'shift_type' => 'morning',
        'required_roles' => [
            ['role' => 'operator', 'count' => 2],
            ['role' => 'supervisor', 'count' => 1],
        ],
        'status' => 'published',
    ]);

    $worker1 = User::factory()->create();
    $member1 = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker1->id,
        'role' => 'member',
        'overall_compliance_status' => 'compliant',
    ]);
    $worker2 = User::factory()->create();
    $member2 = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker2->id,
        'role' => 'member',
        'overall_compliance_status' => 'compliant',
    ]);

    ShiftPlanAssignment::create([
        'workspace_id' => $this->workspace->id,
        'shift_plan_id' => $plan->id,
        'worker_id' => $member1->id,
        'role' => 'operator',
        'status' => 'assigned',
    ]);
    ShiftPlanAssignment::create([
        'workspace_id' => $this->workspace->id,
        'shift_plan_id' => $plan->id,
        'worker_id' => $member2->id,
        'role' => 'operator',
        'status' => 'assigned',
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness?date={$this->today}&shift=morning"
    );

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data['date'])->toBe($this->today);
    expect($data['shift_type'])->toBe('morning');
    expect($data['plan_id'])->toBe($plan->id);
    expect($data['overall_readiness'])->toBeGreaterThan(0);
    expect($data['roles'])->toHaveCount(2);
});

it('readiness calculation reflects gaps for missing roles', function () {
    // Mock ComplianceService to return 'compliant' for test workers
    $complianceMock = Mockery::mock(ComplianceService::class);
    $complianceMock->shouldReceive('calculateWorkerStatus')->andReturn('compliant');
    $this->app->instance(ComplianceService::class, $complianceMock);

    $plan = ShiftPlan::create([
        'workspace_id' => $this->workspace->id,
        'date' => $this->today,
        'shift_type' => 'night',
        'required_roles' => [
            ['role' => 'operator', 'count' => 3],
        ],
        'status' => 'published',
    ]);

    $worker = User::factory()->create();
    $member = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->id,
        'role' => 'member',
        'overall_compliance_status' => 'compliant',
    ]);

    ShiftPlanAssignment::create([
        'workspace_id' => $this->workspace->id,
        'shift_plan_id' => $plan->id,
        'worker_id' => $member->id,
        'role' => 'operator',
        'status' => 'assigned',
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness?date={$this->today}&shift=night"
    );

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data['overall_readiness'])->toBe(33.3);
    expect($data['critical_gaps'])->toHaveCount(1);
    expect($data['critical_gaps'][0]['role'])->toBe('operator');
    expect($data['critical_gaps'][0]['gap'])->toBe(2);
});

it('readiness returns empty structure when no plan exists', function () {
    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness?date={$this->today}&shift=morning"
    );

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data['plan_id'])->toBeNull();
    expect($data['overall_readiness'])->toEqual(100.0);
    expect($data['roles'])->toHaveCount(0);
});

it('rejects cross-workspace plan access', function () {
    $otherWorkspace = Workspace::factory()->create();
    $plan = ShiftPlan::create([
        'workspace_id' => $otherWorkspace->id,
        'date' => $this->today,
        'shift_type' => 'morning',
        'required_roles' => [['role' => 'operator', 'count' => 1]],
        'status' => 'draft',
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness/plans/{$plan->id}/publish",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(403);
});

it('rejects non-member with 403', function () {
    $other = User::factory()->create();
    Sanctum::actingAs($other);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/shift-readiness/plans"
    );

    $response->assertStatus(403);
});
