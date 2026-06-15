<?php

use App\Core\Models\Alert;
use App\Core\Models\User;
use App\Core\Models\Workspace;
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

it('lists unacknowledged alerts', function () {
    Alert::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'type' => 'fatigue',
        'severity' => 'warning',
        'title' => 'Fatigue threshold exceeded',
    ]);
    Alert::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'type' => 'geofence',
        'severity' => 'info',
        'title' => 'Outside geofence',
        'acknowledged_at' => now(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/alerts");

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.type'))->toBe('fatigue');
});

it('acknowledges an alert', function () {
    $alert = Alert::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'type' => 'fatigue',
        'severity' => 'critical',
        'title' => 'Critical fatigue',
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hr/alerts/{$alert->id}/acknowledge",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);
    expect($response->json('data.acknowledged_at'))->not->toBeNull();
    expect($alert->fresh()->acknowledged_at)->not->toBeNull();
});

it('returns 404 for unknown alert', function () {
    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hr/alerts/nonexistent-id/acknowledge",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(404);
});

it('only lists alerts for the current workspace', function () {
    $otherWorkspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    Alert::create([
        'workspace_id' => $otherWorkspace->id,
        'user_id' => $this->user->id,
        'type' => 'fatigue',
        'severity' => 'warning',
        'title' => 'Other workspace alert',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/alerts");

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(0);
});
