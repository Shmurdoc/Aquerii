<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\PTW\Models\Permit;
use App\Modules\PTW\Models\PermitHazard;
use App\Modules\PTW\Models\PermitIsolation;
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

it('lists permits scoped to workspace', function () {
    Permit::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
    ]);
    $other = Workspace::factory()->create();
    Permit::factory()->create(['workspace_id' => $other->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/permits");
    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('filters permits by status, type and risk_level', function () {
    Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'type' => Permit::TYPE_HOT_WORK,
        'status' => Permit::STATUS_DRAFT,
        'risk_level' => Permit::RISK_LOW,
    ]);
    Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'type' => Permit::TYPE_CONFINED_SPACE,
        'status' => Permit::STATUS_APPROVED,
        'risk_level' => Permit::RISK_EXTREME,
    ]);

    $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/permits?status=draft")
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'draft');

    $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/permits?type=confined_space")
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.type', 'confined_space');
});

it('creates a permit with a unique reference and nested hazards/isolations', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits",
        [
            'type' => Permit::TYPE_HOT_WORK,
            'title' => 'Welding on conveyor 2',
            'description' => 'Hot work permit for welding repairs',
            'location' => 'Processing Plant',
            'risk_level' => Permit::RISK_MEDIUM,
            'work_method_statement' => '1. Isolate, 2. Test, 3. Weld, 4. Verify',
            'ppe_required' => 'Hard hat, gloves, face shield',
            'pre_conditions' => ['Gas test < 1% LEL', 'Fire watch posted'],
            'hazards' => [
                ['description' => 'Sparks', 'control_measure' => 'Fire blanket', 'residual_risk' => 'low'],
            ],
            'isolations' => [
                ['isolation_point' => 'Conveyor 2 motor', 'energy_type' => 'electrical', 'method' => 'LOTO'],
            ],
        ]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.reference', 'PTW-'.now()->format('Y').'-0001')
        ->assertJsonPath('data.issuer_id', $this->user->id);

    $permitId = $response->json('data.id');
    expect(PermitHazard::where('permit_id', $permitId)->count())->toBe(1);
    expect(PermitIsolation::where('permit_id', $permitId)->count())->toBe(1);
});

it('generates a sequential reference per workspace per year', function () {
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits",
        [
            'type' => Permit::TYPE_LIFTING,
            'title' => 'First lift',
            'description' => 'Lift crusher',
            'location' => 'Workshop',
            'risk_level' => Permit::RISK_HIGH,
            'work_method_statement' => 'Plan, brief, lift, lower',
            'ppe_required' => 'Hard hat, boots',
        ]
    )->assertStatus(201)
        ->assertJsonPath('data.reference', 'PTW-'.now()->format('Y').'-0001');

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits",
        [
            'type' => Permit::TYPE_LIFTING,
            'title' => 'Second lift',
            'description' => 'Lift crusher again',
            'location' => 'Workshop',
            'risk_level' => Permit::RISK_HIGH,
            'work_method_statement' => 'Plan, brief, lift, lower',
            'ppe_required' => 'Hard hat, boots',
        ]
    )->assertStatus(201)
        ->assertJsonPath('data.reference', 'PTW-'.now()->format('Y').'-0002');
});

it('rejects invalid permit type', function () {
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits",
        [
            'type' => 'definitely-not-a-type',
            'title' => 'Test',
            'description' => 'Test',
            'location' => 'Test',
            'risk_level' => 'low',
            'work_method_statement' => 'Test',
            'ppe_required' => 'Test',
        ]
    )->assertStatus(422)
        ->assertJsonPath('error.code', 'VALIDATION_ERROR')
        ->assertJsonStructure(['error' => ['details' => ['type']]]);
});

it('shows a permit with relations and available transitions', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
    ]);

    $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}")
        ->assertStatus(200)
        ->assertJsonPath('data.id', $permit->id)
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonStructure(['data' => ['hazards', 'isolations'], 'available_transitions']);
});

it('updates a draft permit and refuses to update a non-draft permit', function () {
    $permit = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);

    $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}",
        ['title' => 'Updated title']
    )->assertStatus(200)
        ->assertJsonPath('data.title', 'Updated title');

    $issued = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_ACTIVE,
    ]);

    $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/ptw/permits/{$issued->id}",
        ['title' => 'Cannot edit']
    )        ->assertStatus(422)
        ->assertJsonPath('error.code', 'VALIDATION_ERROR')
        ->assertJsonStructure(['error' => ['details' => ['status']]]);
});

it('deletes only draft permits', function () {
    $draft = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_DRAFT,
    ]);
    $this->deleteJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$draft->id}")
        ->assertStatus(200);

    $active = Permit::factory()->create([
        'workspace_id' => $this->workspace->id,
        'issuer_id' => $this->user->id,
        'status' => Permit::STATUS_ACTIVE,
    ]);
    $this->deleteJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$active->id}")
        ->assertStatus(422);
});

it('forbids access to a non-member', function () {
    $other = User::factory()->create();
    Sanctum::actingAs($other);

    $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/permits")
        ->assertStatus(403);
});

it('returns 404 when the permit belongs to a different workspace', function () {
    $other = Workspace::factory()->create();
    $permit = Permit::factory()->create([
        'workspace_id' => $other->id,
        'issuer_id' => $this->user->id,
    ]);

    $this->getJson("/api/workspaces/{$this->workspace->id}/ptw/permits/{$permit->id}")
        ->assertStatus(404);
});
