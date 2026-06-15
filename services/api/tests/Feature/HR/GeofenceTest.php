<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceGeofence;
use App\Core\Models\WorkspaceMember;
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
});

it('lists geofences', function () {
    WorkspaceGeofence::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Site A',
        'lat' => -25.746111,
        'lng' => 28.188056,
        'radius_meters' => 100,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/geofences");
    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.name'))->toBe('Site A');
});

it('creates a geofence', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/geofences",
        [
            'name' => 'Main Office',
            'lat' => -25.746111,
            'lng' => 28.188056,
            'radius_meters' => 200,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);
    expect($response->json('data.name'))->toBe('Main Office');
    expect($response->json('data.radius_meters'))->toEqual(200.0);
    $this->assertDatabaseHas('workspace_geofences', ['name' => 'Main Office']);
});

it('updates a geofence', function () {
    $geofence = WorkspaceGeofence::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Old Name',
        'lat' => -25.746111,
        'lng' => 28.188056,
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hr/geofences/{$geofence->id}",
        ['name' => 'New Name'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);
    expect($response->json('data.name'))->toBe('New Name');
});

it('deletes a geofence', function () {
    $geofence = WorkspaceGeofence::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Temp',
        'lat' => -25.746111,
        'lng' => 28.188056,
    ]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/hr/geofences/{$geofence->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);
    $this->assertDatabaseMissing('workspace_geofences', ['id' => $geofence->id]);
});

it('scopes geofences to workspace', function () {
    $other = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceGeofence::create([
        'workspace_id' => $other->id,
        'name' => 'Other site',
        'lat' => -25.746111,
        'lng' => 28.188056,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/geofences");
    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(0);
});

it('returns geofence_status=outside when clocking in outside geofences', function () {
    WorkspaceGeofence::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Office',
        'lat' => -25.746111,
        'lng' => 28.188056,
        'radius_meters' => 10,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-in",
        ['lat' => -25.750000, 'lng' => 28.190000],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);
    expect($response->json('geofence_status'))->toBe('outside');
});

it('returns geofence_status=inside when clocking in within geofence', function () {
    WorkspaceGeofence::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Office',
        'lat' => -25.746111,
        'lng' => 28.188056,
        'radius_meters' => 1000,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-in",
        ['lat' => -25.746111, 'lng' => 28.188056],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);
    expect($response->json('geofence_status'))->toBe('inside');
});

it('rejects geofence creation with missing lat', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/geofences",
        [
            'name' => 'Bad Geofence',
            'lng' => 28.188056,
            'radius_meters' => 100,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422);
});

it('rejects geofence with zero radius', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/geofences",
        [
            'name' => 'Zero Radius',
            'lat' => -25.746111,
            'lng' => 28.188056,
            'radius_meters' => 0,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422);
});

it('rejects clock-in with out-of-range latitude', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-in",
        ['lat' => 100, 'lng' => 200],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422);
});
