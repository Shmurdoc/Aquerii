<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Competency\Models\CompetencyType;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\TrainingRecord;
use App\Modules\Equipment\Models\EquipmentCategory;
use Carbon\Carbon;
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

// ===== Competency Types =====

it('creates a competency type', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/competency/types",
        ['name' => 'Blasting License', 'category' => 'license', 'issuing_body' => 'DMR'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Blasting License');
});

it('lists competency types', function () {
    CompetencyType::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/competency/types");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('rejects duplicate competency type name in same workspace', function () {
    CompetencyType::factory()->create(['workspace_id' => $this->workspace->id, 'name' => 'Blasting License']);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/competency/types",
        ['name' => 'Blasting License'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422);
});

it('shows a competency type with relationships', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/competency/types/{$type->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.id', $type->id);
});

it('updates a competency type', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/competency/types/{$type->id}",
        ['description' => 'Updated description']
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.description', 'Updated description');
});

it('deletes a competency type', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/competency/types/{$type->id}");

    $response->assertStatus(200);
    $this->assertSoftDeleted($type);
});

// ===== Competency Records =====

it('creates a competency record', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/competency/records",
        [
            'user_id' => $this->user->id,
            'competency_type_id' => $type->id,
            'issued_at' => '2026-01-01',
            'expires_at' => '2028-01-01',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.user_id', $this->user->id);
});

it('lists competency records with filtering by status', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);
    CompetencyRecord::factory()->count(2)->active()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'competency_type_id' => $type->id,
    ]);
    CompetencyRecord::factory()->expired()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'competency_type_id' => $type->id,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/competency/records?status=active"
    );

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('replaces existing active record when creating new one', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);
    CompetencyRecord::factory()->active()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'competency_type_id' => $type->id,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/competency/records",
        [
            'user_id' => $this->user->id,
            'competency_type_id' => $type->id,
            'issued_at' => '2026-06-01',
            'expires_at' => '2028-06-01',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);
    expect(CompetencyRecord::where('workspace_id', $this->workspace->id)->where('status', 'replaced')->count())->toBe(1);
});

it('deletes a competency record', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);
    $record = CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'competency_type_id' => $type->id,
    ]);

    $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/competency/records/{$record->id}");

    $response->assertStatus(200);
    $this->assertSoftDeleted($record);
});

// ===== COF Records =====

it('creates a COF record', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/competency/cofs",
        [
            'user_id' => $this->user->id,
            'type' => 'medical',
            'issued_at' => '2026-01-01',
            'expires_at' => '2027-01-01',
            'issued_by' => 'Dr. Smith',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.type', 'medical');
});

it('lists COF records with expiring soon filter', function () {
    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'expires_at' => Carbon::now()->addDays(15),
        'status' => 'active',
    ]);
    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'expires_at' => Carbon::now()->addDays(60),
        'status' => 'active',
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/competency/cofs?expiring_soon=30"
    );

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data');
});

// ===== Competency Requirements =====

it('creates a competency requirement for an equipment category', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);
    $category = EquipmentCategory::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/competency/requirements",
        [
            'requirable_type' => 'equipment_category',
            'requirable_id' => $category->id,
            'competency_type_id' => $type->id,
            'is_mandatory' => true,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);
});

it('rejects duplicate requirement for same entity and competency type', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/competency/requirements",
        [
            'requirable_type' => 'equipment_category',
            'requirable_id' => (string) Str::uuid(),
            'competency_type_id' => $type->id,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/competency/requirements",
        [
            'requirable_type' => 'equipment_category',
            'requirable_id' => (string) Str::uuid(),
            'competency_type_id' => $type->id,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422);
});

// ===== Training Records =====

it('creates a training record', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/competency/training",
        [
            'user_id' => $this->user->id,
            'competency_type_id' => $type->id,
            'training_name' => 'Advanced Blasting Techniques',
            'provider' => 'DMR Training',
            'date_completed' => '2026-05-01',
            'result' => 'passed',
            'score' => 87.5,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.training_name', 'Advanced Blasting Techniques');
});

it('lists training records for a user', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);
    TrainingRecord::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'competency_type_id' => $type->id,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/competency/training?user_id={$this->user->id}"
    );

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

// ===== Dashboard / Stats =====

it('returns compliance stats', function () {
    $type = CompetencyType::factory()->create(['workspace_id' => $this->workspace->id]);
    CompetencyRecord::factory()->count(3)->active()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'competency_type_id' => $type->id,
    ]);
    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'status' => 'active',
        'expires_at' => Carbon::now()->addDays(15),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/competency/stats");

    $response->assertStatus(200);
});

// ===== Cross-workspace isolation =====

it('rejects cross-workspace access to competency types', function () {
    $otherWorkspace = Workspace::factory()->create();
    $type = CompetencyType::factory()->create(['workspace_id' => $otherWorkspace->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/competency/types/{$type->id}");

    $response->assertStatus(404);
});
