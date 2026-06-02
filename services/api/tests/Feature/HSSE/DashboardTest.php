<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\HSSE\Models\Hazard;
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

it('returns aggregated dashboard stats', function () {
    Incident::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'severity' => 'high',
    ]);
    Incident::factory()->create([
        'workspace_id' => $this->workspace->id,
        'reporter_id' => $this->user->id,
        'severity' => 'low',
        'coida_reportable' => true,
    ]);
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

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hsse/dashboard");
    $response->assertStatus(200)
        ->assertJsonPath('data.incidents.total', 4)
        ->assertJsonPath('data.incidents.coida_reportable', 1)
        ->assertJsonPath('data.hazards.total', 2)
        ->assertJsonPath('data.hazards.extreme_risk', 1)
        ->assertJsonStructure(['data' => ['incidents' => ['by_severity', 'by_type'], 'hazards' => ['by_risk_level']]]);
});
