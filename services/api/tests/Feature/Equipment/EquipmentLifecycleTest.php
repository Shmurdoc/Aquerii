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
    $this->category = EquipmentCategory::factory()->create(['workspace_id' => $this->workspace->id]);
    Sanctum::actingAs($this->user);
});

it('creates equipment returning 201', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment",
        [
            'category_id' => $this->category->id,
            'plant_number' => 'L-001',
            'name' => 'Front End Loader',
            'make' => 'Caterpillar',
            'model' => '950 GC',
            'serial_number' => 'SN-CAT-001',
            'year' => 2023,
            'location' => 'Processing Plant',
            'status' => 'operational',
            'purchase_date' => '2023-01-15',
            'purchase_cost' => 350000.00,
            'warranty_expiry' => '2026-01-15',
            'notes' => 'Primary loading equipment for processing area.',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.plant_number', 'L-001')
        ->assertJsonPath('data.name', 'Front End Loader')
        ->assertJsonPath('data.status', 'operational');
});

it('lists equipment with status filter', function () {
    Equipment::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'status' => 'operational',
    ]);
    Equipment::factory()->breakdown()->create([
        'workspace_id' => $this->workspace->id,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/equipment?status=breakdown"
    );

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(1);
});

it('lists equipment with search filter', function () {
    Equipment::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Compressor Alpha',
        'plant_number' => 'C-001',
    ]);
    Equipment::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Conveyor Belt',
        'plant_number' => 'CV-002',
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/equipment?search=compressor"
    );

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(1);
});

it('shows equipment with relationships', function () {
    $equipment = Equipment::factory()->create([
        'workspace_id' => $this->workspace->id,
        'category_id' => $this->category->id,
        'plant_number' => 'G-042',
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$equipment->id}"
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.plant_number', 'G-042')
        ->assertJsonPath('data.category.name', $this->category->name);
});

it('updates equipment', function () {
    $equipment = Equipment::factory()->create([
        'workspace_id' => $this->workspace->id,
        'status' => 'operational',
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$equipment->id}",
        ['name' => 'Updated Loader', 'status' => 'standby']
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Updated Loader')
        ->assertJsonPath('data.status', 'standby');
});

it('soft deletes equipment returning 204', function () {
    $equipment = Equipment::factory()->create([
        'workspace_id' => $this->workspace->id,
    ]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$equipment->id}"
    );

    $response->assertStatus(204);
    expect(Equipment::where('workspace_id', $this->workspace->id)->count())->toBe(0);
    expect(Equipment::withTrashed()->where('workspace_id', $this->workspace->id)->count())->toBe(1);
});

it('fails with 422 when required fields are missing on create', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment",
        ['category_id' => $this->category->id],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['plant_number', 'name']);
});

it('fails with 422 when status is invalid', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment",
        [
            'category_id' => $this->category->id,
            'plant_number' => 'L-002',
            'name' => 'Test Equipment',
            'status' => 'nonexistent_status_that_is_very_long_and_should_fail',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);
});

it('rejects cross-workspace equipment access', function () {
    $otherWorkspace = Workspace::factory()->create();
    $equipment = Equipment::factory()->create([
        'workspace_id' => $this->workspace->id,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$otherWorkspace->id}/equipment/{$equipment->id}"
    );

    $response->assertStatus(404);
});

it('cannot view equipment from another workspace via listing', function () {
    $otherWorkspace = Workspace::factory()->create();
    Equipment::factory()->create(['workspace_id' => $otherWorkspace->id]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/equipment"
    );

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(0);
});

it('rejects non-member with 403', function () {
    $other = User::factory()->create();
    Sanctum::actingAs($other);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/equipment"
    );

    $response->assertStatus(403);
});
