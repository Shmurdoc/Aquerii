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

it('rejects W.Cl.2 generation for incidents not flagged as coida_reportable', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => false,
    ]);

    $this->getJson("/api/workspaces/{$this->workspace->id}/hsse/incidents/{$incident->id}/coida-wcl2")
        ->assertStatus(422);
});

it('returns a structured W.Cl.2 payload for a coida_reportable incident', function () {
    $incident = Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'coida_reference' => 'W.Cl.2/2026/0042',
        'type' => 'lost_time',
        'severity' => 'high',
        'occurred_at' => now()->subDays(2),
        'mhsa_classification' => 'B',
        'body_part_affected' => 'Right hand',
        'injury_type' => 'Fracture',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hsse/incidents/{$incident->id}/coida-wcl2");
    $response->assertStatus(200)
        ->assertJsonPath('data.form', 'W.Cl.2')
        ->assertJsonPath('data.workspace.id', $this->workspace->id)
        ->assertJsonPath('data.incident.reference', $incident->reference)
        ->assertJsonPath('data.incident.coida_reference', 'W.Cl.2/2026/0042')
        ->assertJsonPath('data.incident.mhsa_classification', 'B');

    $payload = $response->json('data');
    expect($payload['submission_deadline'])->not->toBeNull();
});

it('returns a COIDA summary for a workspace', function () {
    Incident::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => true,
        'type' => 'first_aid',
    ]);
    Incident::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'coida_reportable' => false,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hsse/coida/summary");
    $response->assertStatus(200)
        ->assertJsonPath('data.total', 3)
        ->assertJsonPath('data.by_type.first_aid', 3);
});

it('returns a MHSA Section 11 report aggregated by classification', function () {
    Incident::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'A',
        'type' => 'fatality',
    ]);
    Incident::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'B',
        'type' => 'lost_time',
    ]);
    Incident::factory()->count(5)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => 'C',
        'type' => 'near_miss',
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'mhsa_classification' => null,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hsse/mhsa/report");
    $response->assertStatus(200)
        ->assertJsonPath('data.section', '11')
        ->assertJsonPath('data.totals.all', 10)
        ->assertJsonPath('data.totals.class_a', 2)
        ->assertJsonPath('data.totals.class_b', 3)
        ->assertJsonPath('data.totals.class_c', 5)
        ->assertJsonPath('data.by_classification.A.count', 2)
        ->assertJsonPath('data.by_classification.B.count', 3)
        ->assertJsonPath('data.by_classification.C.count', 5);
});
