<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Support\Facades\Gate;
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
    $response = $this->postJson("/api/workspaces/{$this->workspace->id}/hr/attendance/clock-in");
    $response->assertStatus(200);

    $response = $this->postJson("/api/workspaces/{$this->workspace->id}/hr/attendance/clock-out");
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
