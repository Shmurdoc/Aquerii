<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\HSSE\Models\Incident;
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

it('lists incidents for the workspace', function () {
    Incident::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
    ]);
    Incident::factory()->create(['reporter_id' => $this->user->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hsse/incidents");
    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('filters incidents by severity', function () {
    Incident::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'severity' => 'critical',
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'severity' => 'low',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hsse/incidents?severity=critical");
    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('creates an incident with auto-generated reference', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents",
        [
            'title' => 'Slip and fall at shaft entrance',
            'description' => 'Worker slipped on wet surface near shaft 1 entrance',
            'type' => 'first_aid',
            'severity' => 'medium',
            'occurred_at' => now()->subHour()->toIso8601String(),
            'location' => 'Shaft 1 entrance',
            'coida_reportable' => true,
        ]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.title', 'Slip and fall at shaft entrance')
        ->assertJsonPath('data.status', 'open')
        ->assertJsonPath('data.workspace_id', $this->workspace->id);

    $reference = $response->json('data.reference');
    expect($reference)->toStartWith('INC-'.now()->format('Y').'-');
});

it('requires a title, type, and severity when creating an incident', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents",
        ['description' => 'incomplete']
    );
    $response->assertStatus(422);
});

it('shows an incident with relations', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hsse/incidents/{$incident->id}");
    $response->assertStatus(200)
        ->assertJsonPath('data.id', $incident->id)
        ->assertJsonStructure(['data' => ['reporter', 'investigator']]);
});

it('updates an incident', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'status' => Incident::STATUS_OPEN,
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hsse/incidents/{$incident->id}",
        [
            'status' => 'closed',
            'root_cause' => 'Inadequate drainage caused water accumulation',
        ]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'closed')
        ->assertJsonPath('data.root_cause', 'Inadequate drainage caused water accumulation');

    expect($response->json('data.closed_at'))->not->toBeNull();
});

it('soft-deletes an incident', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
    ]);

    $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/hsse/incidents/{$incident->id}");
    $response->assertStatus(200);

    $this->assertSoftDeleted('hsse_incidents', ['id' => $incident->id]);
});

it('rejects cross-workspace incident access', function () {
    $otherUser = User::factory()->create();
    $otherWorkspace = Workspace::factory()->create(['owner_id' => $otherUser->id]);
    Sanctum::actingAs($otherUser);

    $response = $this->getJson("/api/workspaces/{$otherWorkspace->id}/hsse/incidents");
    $response->assertStatus(403);
});
