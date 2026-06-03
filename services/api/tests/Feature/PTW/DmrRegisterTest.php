<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\PTW\Models\Permit;
use App\Modules\PTW\Models\PermitHazard;
use App\Modules\PTW\Models\PermitIsolation;
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

it('returns a structured DMR permit register', function () {
    $issuer = User::factory()->create();
    $holder = User::factory()->create();

    $hot = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $issuer->id,
        'type' => Permit::TYPE_HOT_WORK,
        'status' => Permit::STATUS_CLOSED,
        'risk_level' => Permit::RISK_MEDIUM,
        'issued_at' => now()->subDay(),
        'closed_at' => now(),
    ]);
    PermitHazard::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'permit_id' => $hot->id,
    ]);
    PermitIsolation::factory()->create([
        'workspace_id' => $this->workspace->id,
        'permit_id' => $hot->id,
    ]);

    $confined = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $issuer->id,
        'type' => Permit::TYPE_CONFINED_SPACE,
        'status' => Permit::STATUS_ACTIVE,
        'risk_level' => Permit::RISK_EXTREME,
        'holder_id' => $holder->id,
        'issued_at' => now()->subHours(2),
        'activated_at' => now()->subHour(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/register");
    $response->assertStatus(200)
        ->assertJsonPath('register.authority', 'Department of Mineral Resources (DMR)')
        ->assertJsonPath('register.regulation',
            'Mineral and Petroleum Resources Development Act 28 of 2002, Section 11')
        ->assertJsonPath('register.summary.total', 2)
        ->assertJsonPath('register.summary.active_count', 1)
        ->assertJsonPath('register.summary.closed_count', 1)
        ->assertJsonPath('register.summary.high_risk_count', 1)
        ->assertJsonCount(2, 'register.permits');
});

it('excludes draft permits from the register', function () {
    Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);
    Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_REQUESTED,
    ]);

    $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/register")
        ->assertStatus(200)
        ->assertJsonPath('register.summary.total', 0);
});

it('scopes the register to a single workspace', function () {
    Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_CLOSED,
    ]);
    $other = Workspace::factory()->create();
    Permit::factory()->create([
        'workspace_id' => $other->id,
        'status' => Permit::STATUS_CLOSED,
    ]);

    $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/register")
        ->assertStatus(200)
        ->assertJsonPath('register.summary.total', 1);
});

it('serialises the register to CSV with the proper headers', function () {
    Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'type' => Permit::TYPE_HOT_WORK,
        'status' => Permit::STATUS_CLOSED,
        'title' => 'Welding on conveyor',
        'location' => 'Processing Plant',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/register?format=csv");
    $response->assertStatus(200)
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

    $body = $response->streamedContent();
    expect($body)->toContain('Reference,Type,Status,Risk,Title,Location');
    expect($body)->toContain('PTW-'.now()->format('Y').'-0001');
});

it('rejects a non-member from generating a register', function () {
    $intruder = User::factory()->create();
    Sanctum::actingAs($intruder);

    $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/register")
        ->assertStatus(403);
});

it('writes an audit log entry when the register is generated', function () {
    Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_CLOSED,
    ]);

    $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/register")
        ->assertStatus(200);

    $log = DB::table('audit_logs')
        ->where('action', 'ptw.register.generated')
        ->where('workspace_id', $this->workspace->id)
        ->first();

    expect($log)->not->toBeNull();
    expect($log->user_id)->toBe($this->user->id);
});
