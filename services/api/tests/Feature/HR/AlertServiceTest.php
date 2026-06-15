<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Services\AlertService;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->supervisor = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    $this->supervisorMember = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->supervisor->id,
        'role' => 'admin',
    ]);
    $this->userMember = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'member',
        'reports_to' => $this->supervisorMember->id,
    ]);
    Sanctum::actingAs($this->user);
});

it('creates an alert', function () {
    $alert = (new AlertService)->create(
        workspaceId: $this->workspace->id,
        userId: $this->user->id,
        type: 'fatigue',
        severity: 'warning',
        title: 'Fatigue threshold exceeded',
        message: 'User has worked 13 hours in the last 24h.',
        assignedTo: $this->user->id,
    );

    expect($alert->id)->not->toBeNull();
    expect($alert->type)->toBe('fatigue');
    expect($alert->severity)->toBe('warning');
    expect($alert->acknowledged_at)->toBeNull();
    $this->assertDatabaseHas('alerts', ['id' => $alert->id]);
});

it('creates an alert without optional fields', function () {
    $alert = (new AlertService)->create(
        workspaceId: $this->workspace->id,
        userId: $this->user->id,
        type: 'geofence',
        severity: 'info',
        title: 'Outside geofence',
    );

    expect($alert->id)->not->toBeNull();
    expect($alert->message)->toBeNull();
});

it('auto-assigns supervisor from reports_to', function () {
    $alert = (new AlertService)->create(
        workspaceId: $this->workspace->id,
        userId: $this->user->id,
        type: 'fatigue',
        severity: 'warning',
        title: 'Fatigue threshold exceeded',
    );

    expect($alert->assigned_to)->toBe($this->supervisor->id);
});

it('can acknowledge an alert', function () {
    $alert = (new AlertService)->create(
        workspaceId: $this->workspace->id,
        userId: $this->user->id,
        type: 'fatigue',
        severity: 'critical',
        title: 'Critical fatigue',
    );

    $alert->update(['acknowledged_at' => now()]);

    $this->assertNotNull($alert->fresh()->acknowledged_at);
});
