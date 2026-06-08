<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\CompetencyType;
use App\Modules\PTW\Models\Permit;
use App\Modules\PTW\Services\PermitWorkflowService;
use Carbon\Carbon;
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
});

it('moves a permit through the full happy path', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);

    $this->postJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/request")
        ->assertStatus(200)
        ->assertJsonPath('data.status', 'requested');

    $this->postJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/approve")
        ->assertStatus(200)
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('data.approved_at', fn ($v) => $v !== null);

    $holder = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'role' => 'member',
    ]);

    CofRecord::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addYear(),
        'verified_at' => Carbon::now(),
    ]);
    $inductionType = CompetencyType::create(['name' => 'Site Induction']);
    CompetencyRecord::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'competency_type_id' => $inductionType->id,
        'status' => 'active',
        'verified_at' => Carbon::now(),
    ]);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/issue",
        [
            'valid_until' => now()->addHours(8)->toIso8601String(),
            'holder_id' => $holder->id,
        ]
    )->assertStatus(200)
        ->assertJsonPath('data.status', 'issued')
        ->assertJsonPath('data.holder_id', $holder->id);

    Sanctum::actingAs($holder);
    $this->postJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/activate")
        ->assertStatus(200)
        ->assertJsonPath('data.status', 'active');

    Sanctum::actingAs($this->user);
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/suspend",
        ['reason' => 'Gas alarm triggered; evacuating area']
    )->assertStatus(200)
        ->assertJsonPath('data.status', 'suspended')
        ->assertJsonPath('data.suspension_reason', 'Gas alarm triggered; evacuating area');

    $this->postJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/resume")
        ->assertStatus(200)
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.suspension_reason', null);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/close",
        ['notes' => 'Work completed, area cleaned, equipment de-energised']
    )->assertStatus(200)
        ->assertJsonPath('data.status', 'closed')
        ->assertJsonPath('data.closed_at', fn ($v) => $v !== null);
});

it('rejects a transition from an illegal source state', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);

    $this->postJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/approve")
        ->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});

it('requires a reason for reject', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_REQUESTED,
    ]);

    $this->postJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/reject")
        ->assertStatus(422)
        ->assertJsonValidationErrors(['reason']);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/reject",
        ['reason' => 'Insufficient hazard controls']
    )->assertStatus(200)
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.rejection_reason', 'Insufficient hazard controls');
});

it('requires a reason for suspend', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_ACTIVE,
    ]);

    $this->postJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/suspend")
        ->assertStatus(422)
        ->assertJsonValidationErrors(['reason']);
});

it('refuses to activate a permit past its validity window', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_ISSUED,
        'valid_from' => now()->subDays(2),
        'valid_until' => now()->subDay(),
    ]);

    $this->postJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/activate")
        ->assertStatus(422)
        ->assertJsonValidationErrors(['valid_until']);
});

it('refuses to issue without a future valid_until', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_APPROVED,
    ]);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/issue",
        ['valid_until' => now()->subHour()->toIso8601String()]
    )->assertStatus(422)
        ->assertJsonValidationErrors(['valid_until']);
});

it('rejects a viewer from performing any state transition', function () {
    $viewer = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $viewer->id,
        'role' => 'viewer',
    ]);
    Sanctum::actingAs($viewer);

    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);

    $this->postJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/request")
        ->assertStatus(403);
});

it('lists the available transitions for the current user', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);

    $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/transitions")
        ->assertStatus(200)
        ->assertJsonPath('data.0', 'request');
});

it('writes an audit log entry on every transition', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);

    $this->postJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/request")
        ->assertStatus(200);

    $log = DB::table('audit_logs')
        ->where('resource_type', 'permit')
        ->where('resource_id', $permit->id)
        ->where('action', 'ptw.permit.request')
        ->first();

    expect($log)->not->toBeNull();
    expect($log->user_id)->toBe($this->user->id);
    expect($log->workspace_id)->toBe($this->workspace->id);
});

it('refuses to issue a permit when the holder is non-compliant', function () {
    $holder = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'role' => 'member',
    ]);

    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_APPROVED,
        'approved_at' => now(),
    ]);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/issue",
        [
            'valid_until' => now()->addHours(8)->toIso8601String(),
            'holder_id' => $holder->id,
        ]
    )
        ->assertStatus(422)
        ->assertJsonStructure(['message', 'errors' => ['workers']])
        ->assertJsonPath('message', fn ($m) => str_contains($m, 'Cannot issue permit'))
        ->assertJsonPath('errors.workers.0', fn ($e) => str_contains($e, (string) $holder->id));
});

it('refuses to activate a permit when the holder is non-compliant', function () {
    $holder = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $holder->id,
        'role' => 'member',
    ]);

    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'holder_id' => $holder->id,
        'status' => Permit::STATUS_ISSUED,
        'valid_from' => now(),
        'valid_until' => now()->addHours(8),
    ]);

    Sanctum::actingAs($holder);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}/activate"
    )
        ->assertStatus(422)
        ->assertJsonStructure(['message', 'errors' => ['workers']])
        ->assertJsonPath('message', fn ($m) => str_contains($m, 'Cannot activate permit'))
        ->assertJsonPath('errors.workers.0', fn ($e) => str_contains($e, (string) $holder->id));
});

it('exposes a service-level canTransition helper', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);
    $svc = app(PermitWorkflowService::class);

    expect($svc->canTransition($permit, 'request', $this->user))->toBeTrue();
    expect($svc->canTransition($permit, 'approve', $this->user))->toBeFalse();
    expect($svc->canTransition($permit, 'close', $this->user))->toBeFalse();
});
