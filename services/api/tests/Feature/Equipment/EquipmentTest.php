<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\EquipmentCategory;
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

// ===== Equipment Categories =====

it('creates an equipment category', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment/categories",
        ['name' => 'Loaders', 'description' => 'Wheel loaders and diggers'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Loaders');
});

it('lists equipment categories', function () {
    EquipmentCategory::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/equipment/categories");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('rejects duplicate category name in same workspace', function () {
    EquipmentCategory::factory()->create(['workspace_id' => $this->workspace->id, 'name' => 'Drills']);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment/categories",
        ['name' => 'Drills'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422);
});

// ===== Equipment =====

it('creates equipment', function () {
    $category = EquipmentCategory::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment",
        [
            'category_id' => $category->id,
            'plant_number' => 'L-001',
            'name' => 'Front End Loader',
            'make' => 'Caterpillar',
            'model' => '950 GC',
            'status' => 'operational',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.plant_number', 'L-001')
        ->assertJsonPath('data.status', 'operational');
});

it('lists equipment with filtering', function () {
    EquipmentCategory::factory()->create(['workspace_id' => $this->workspace->id, 'name' => 'Drills']);
    Equipment::factory()->count(2)->create(['workspace_id' => $this->workspace->id, 'status' => 'operational']);
    Equipment::factory()->breakdown()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/equipment?status=breakdown");

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(1);
});

it('shows equipment with relationships', function () {
    $category = EquipmentCategory::factory()->create(['workspace_id' => $this->workspace->id]);
    $equipment = Equipment::factory()->create([
        'workspace_id' => $this->workspace->id,
        'category_id' => $category->id,
        'plant_number' => 'G-042',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/equipment/{$equipment->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.plant_number', 'G-042')
        ->assertJsonPath('data.category.name', $category->name);
});

it('updates equipment status', function () {
    $equipment = Equipment::factory()->create([
        'workspace_id' => $this->workspace->id,
        'status' => 'operational',
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$equipment->id}",
        ['status' => 'breakdown']
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'breakdown');
});

it('rejects cross-workspace equipment access', function () {
    $otherWorkspace = Workspace::factory()->create();
    $equipment = Equipment::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$otherWorkspace->id}/equipment/{$equipment->id}");

    $response->assertStatus(404);
});

// ===== Inspections =====

it('creates an inspection with items', function () {
    $equipment = Equipment::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$equipment->id}/inspections",
        [
            'shift' => 'day',
            'status' => 'passed',
            'items' => [
                ['item_name' => 'Fluid levels OK', 'passed' => true],
                ['item_name' => 'Tyres inflated', 'passed' => true],
                ['item_name' => 'Lights working', 'passed' => false, 'notes' => 'Left headlight out'],
            ],
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'passed');
    expect($response->json('data.items'))->toHaveCount(3);
});

it('lists inspections for equipment', function () {
    $equipment = Equipment::factory()->create(['workspace_id' => $this->workspace->id]);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$equipment->id}/inspections",
        ['items' => [['item_name' => 'Check engine', 'passed' => true]]],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/equipment/{$equipment->id}/inspections");
    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(1);
});

// ===== Breakdowns =====

it('reports a breakdown', function () {
    $equipment = Equipment::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$equipment->id}/breakdowns",
        ['description' => 'Engine overheating, smoke coming from exhaust'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'reported');
});

it('resolves a breakdown', function () {
    $equipment = Equipment::factory()->create(['workspace_id' => $this->workspace->id]);
    $breakdown = \App\Modules\Equipment\Models\EquipmentBreakdown::factory()->create([
        'workspace_id' => $this->workspace->id,
        'equipment_id' => $equipment->id,
        'status' => 'in_progress',
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/equipment/breakdowns/{$breakdown->id}",
        [
            'status' => 'resolved',
            'action_taken' => 'Replaced radiator hose',
            'root_cause' => 'Cracked hose from debris impact',
        ]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'resolved');
});

// ===== Maintenance Schedules =====

it('creates a maintenance schedule', function () {
    $equipment = Equipment::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$equipment->id}/maintenance-schedules",
        [
            'name' => '250hr Service',
            'frequency_type' => 'hours',
            'frequency_value' => 250,
            'trigger_type' => 'meter',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', '250hr Service');
});

it('lists maintenance schedules for equipment', function () {
    $equipment = Equipment::factory()->create(['workspace_id' => $this->workspace->id]);
    \App\Modules\Equipment\Models\MaintenanceSchedule::factory()->create([
        'workspace_id' => $this->workspace->id,
        'equipment_id' => $equipment->id,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$equipment->id}/maintenance-schedules"
    );

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(1);
});
