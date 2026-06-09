<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\HSSE\Models\CorrectiveAction;
use App\Modules\HSSE\Models\Incident;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->assignee = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($this->user);
});

it('creates a corrective action linked to an incident', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hsse/corrective-actions",
        [
            'source_type' => 'incident',
            'source_id' => $incident->id,
            'description' => 'Install proper drainage at shaft 1 entrance',
            'assigned_to' => $this->assignee->id,
            'priority' => 'high',
            'due_date' => now()->addWeek()->toDateString(),
        ]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.source_type', 'incident')
        ->assertJsonPath('data.source_id', $incident->id)
        ->assertJsonPath('data.priority', 'high')
        ->assertJsonPath('data.status', 'open');
});

it('marks an action as completed and stamps completed_at', function () {
    $action = CorrectiveAction::factory()->create([
        'workspace_id' => $this->workspace->id,
        'assigned_to' => $this->assignee->id,
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hsse/corrective-actions/{$action->id}",
        [
            'status' => 'completed',
            'completion_evidence' => 'New drainage installed and tested 2026-06-02',
        ]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'completed');

    expect($response->json('data.completed_at'))->not->toBeNull();
});

it('marks an action as verified and stamps verifier', function () {
    $action = CorrectiveAction::factory()->create([
        'workspace_id' => $this->workspace->id,
        'assigned_to' => $this->assignee->id,
        'status' => 'completed',
        'completed_at' => now()->subDay(),
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/hsse/corrective-actions/{$action->id}",
        ['status' => 'verified']
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'verified')
        ->assertJsonPath('data.verified_by', $this->user->id);

    expect($response->json('data.verified_at'))->not->toBeNull();
});

it('filters overdue actions', function () {
    CorrectiveAction::factory()->create([
        'workspace_id' => $this->workspace->id,
        'assigned_to' => $this->assignee->id,
        'due_date' => now()->subWeek(),
        'status' => 'open',
    ]);
    CorrectiveAction::factory()->create([
        'workspace_id' => $this->workspace->id,
        'assigned_to' => $this->assignee->id,
        'due_date' => now()->addWeek(),
        'status' => 'open',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hsse/corrective-actions?overdue=1");
    $response->assertStatus(200)
        ->assertJsonCount(1, 'data');
});
