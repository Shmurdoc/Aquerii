<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\HSSE\Models\Hazard;
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

it('lists hazards ordered by risk score', function () {
    Hazard::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id' => $this->user->id,
        'risk_score' => 25,
        'risk_level' => 'extreme',
    ]);
    Hazard::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id' => $this->user->id,
        'risk_score' => 4,
        'risk_level' => 'low',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hsse/hazards");
    $response->assertStatus(200)
        ->assertJsonPath('data.0.risk_level', 'extreme')
        ->assertJsonPath('data.1.risk_level', 'low');
});

it('creates a hazard with computed risk level', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hsse/hazards",
        [
            'title' => 'Unguarded conveyor belt',
            'description' => 'Conveyor 2 in processing plant missing guard',
            'category' => 'mechanical',
            'location' => 'Processing Plant',
            'likelihood' => 4,
            'severity' => 5,
        ]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.risk_score', 20)
        ->assertJsonPath('data.risk_level', 'extreme')
        ->assertJsonPath('data.status', 'identified');
});

it('rejects invalid likelihood values', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hsse/hazards",
        [
            'title' => 'Test',
            'description' => 'Test',
            'category' => 'mechanical',
            'likelihood' => 10,
            'severity' => 5,
        ]
    );
    $response->assertStatus(422);
});

it('updates a hazard and recomputes risk level', function () {
    $hazard = Hazard::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id' => $this->user->id,
        'likelihood' => 2,
        'severity' => 2,
        'risk_score' => 4,
        'risk_level' => 'low',
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hsse/hazards/{$hazard->id}",
        ['likelihood' => 5, 'severity' => 5]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.risk_score', 25)
        ->assertJsonPath('data.risk_level', 'extreme');
});

it('filters hazards by risk level', function () {
    Hazard::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id' => $this->user->id,
        'risk_level' => 'extreme',
    ]);
    Hazard::factory()->create([
        'workspace_id' => $this->workspace->id,
        'owner_id' => $this->user->id,
        'risk_level' => 'low',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hsse/hazards?risk_level=extreme");
    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.risk_level', 'extreme');
});
