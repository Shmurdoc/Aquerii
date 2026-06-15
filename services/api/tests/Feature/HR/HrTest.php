<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Support\Facades\Gate;
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

    Gate::define('create', fn ($user, $model, $workspace) => true);
    Gate::define('view', fn ($user, $model) => true);
    Gate::define('update', fn ($user, $model) => true);
    Gate::define('delete', fn ($user, $model) => true);
});

it('lists employees', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/employees");
    $response->assertStatus(200);
});

it('clocks in and out', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-in",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(200);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-out",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(200);
});

it('gets attendance history', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/attendance");
    $response->assertStatus(200);
});

it('gets timesheet', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/timesheet");
    $response->assertStatus(200)
        ->assertJsonPath('data', []);
});

it('gets attendance report', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/attendance/report");
    $response->assertStatus(200)
        ->assertJsonPath('data', []);
});

it('gets leave calendar', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/leave/calendar");
    $response->assertStatus(200)
        ->assertJsonPath('data', []);
});

it('gets leave balance', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/leave/balance");
    $response->assertStatus(200);
});

it('gets expenses list', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/expenses");
    $response->assertStatus(200);
});

it('gets team capacity', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/capacity");
    $response->assertStatus(200);
});

it('rejects cross-workspace HR access', function () {
    $otherWorkspace = Workspace::factory()->create();
    $response = $this->getJson("/api/workspaces/{$otherWorkspace->id}/hr/employees");
    $response->assertStatus(403);
});

it('captures GPS coordinates on clock-in and clock-out', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-in",
        ['lat' => -25.746111, 'lng' => 28.188056],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(200);
    expect($response->json('attendance.clocked_in_lat'))->toEqual(-25.746111);
    expect($response->json('attendance.clocked_in_lng'))->toEqual(28.188056);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-out",
        ['lat' => -25.746200, 'lng' => 28.188100],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(200);
    expect($response->json('attendance.clocked_out_lat'))->toEqual(-25.746200);
    expect($response->json('attendance.clocked_out_lng'))->toEqual(28.188100);
});
