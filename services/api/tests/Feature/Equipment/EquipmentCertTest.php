<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\EquipmentCategory;
use App\Modules\Equipment\Models\EquipmentCertRecord;
use App\Modules\Equipment\Models\EquipmentCertType;
use Carbon\Carbon;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    $category = EquipmentCategory::factory()->create(['workspace_id' => $this->workspace->id]);
    $this->equipment = Equipment::factory()->create([
        'workspace_id' => $this->workspace->id,
        'category_id' => $category->id,
        'status' => 'operational',
    ]);
    Sanctum::actingAs($this->user);
});

it('creates a cert type returning 201', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$this->equipment->id}/cert-types",
        [
            'name' => 'Pressure Vessel Certificate',
            'slug' => 'pressure-vessel-cert',
            'description' => 'Annual certification for pressure vessels',
            'is_mandatory' => true,
            'frequency_days' => 365,
        ]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Pressure Vessel Certificate')
        ->assertJsonPath('data.slug', 'pressure-vessel-cert')
        ->assertJsonPath('data.is_mandatory', true);
});

it('lists cert types', function () {
    EquipmentCertType::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Lifting Gear Cert',
        'slug' => 'lifting-gear-cert',
        'description' => 'Certification for lifting equipment',
        'is_mandatory' => true,
    ]);
    EquipmentCertType::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Electrical Safety',
        'slug' => 'electrical-safety',
        'description' => 'Electrical safety certification',
        'is_mandatory' => false,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$this->equipment->id}/cert-types"
    );

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(2);
});

it('creates a cert record for equipment returning 201', function () {
    $certType = EquipmentCertType::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Lifting Gear Cert',
        'slug' => 'lifting-gear-cert',
        'is_mandatory' => true,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$this->equipment->id}/cert-records",
        [
            'equipment_cert_type_id' => $certType->id,
            'cert_number' => 'CERT-2024-001',
            'issued_at' => '2024-01-01',
            'expires_at' => '2025-01-01',
            'notes' => 'Initial certification.',
        ]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.cert_number', 'CERT-2024-001')
        ->assertJsonPath('data.cert_type.name', 'Lifting Gear Cert');
});

it('verifies a cert record', function () {
    $certType = EquipmentCertType::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Lifting Gear Cert',
        'slug' => 'lifting-gear-cert',
        'is_mandatory' => true,
    ]);

    $record = EquipmentCertRecord::create([
        'workspace_id' => $this->workspace->id,
        'equipment_id' => $this->equipment->id,
        'equipment_cert_type_id' => $certType->id,
        'cert_number' => 'CERT-2024-002',
        'issued_at' => now(),
    ]);

    expect($record->verified_at)->toBeNull();

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$this->equipment->id}/cert-records/{$record->id}/verify"
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.cert_type.name', 'Lifting Gear Cert');
    expect($response->json('data.verified_at'))->not->toBeNull();
});

it('expired cert causes non_compliant compliance status', function () {
    $certType = EquipmentCertType::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Critical Safety Cert',
        'slug' => 'critical-safety-cert',
        'is_mandatory' => true,
    ]);

    EquipmentCertRecord::create([
        'workspace_id' => $this->workspace->id,
        'equipment_id' => $this->equipment->id,
        'equipment_cert_type_id' => $certType->id,
        'cert_number' => 'CERT-EXP-001',
        'issued_at' => Carbon::now()->subMonths(13),
        'expires_at' => Carbon::now()->subMonths(1),
        'verified_at' => Carbon::now()->subMonths(13),
        'verified_by' => $this->user->id,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/compliance/equipment/{$this->equipment->id}"
    );

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data['overall_status'])->toBe('non_compliant');
});

it('compliant certs result in compliant overall status', function () {
    $certType = EquipmentCertType::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Valid Safety Cert',
        'slug' => 'valid-safety-cert',
        'is_mandatory' => true,
    ]);

    EquipmentCertRecord::create([
        'workspace_id' => $this->workspace->id,
        'equipment_id' => $this->equipment->id,
        'equipment_cert_type_id' => $certType->id,
        'cert_number' => 'CERT-VALID-001',
        'issued_at' => Carbon::now()->subMonths(3),
        'expires_at' => Carbon::now()->addMonths(9),
        'verified_at' => Carbon::now()->subMonths(3),
        'verified_by' => $this->user->id,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/compliance/equipment/{$this->equipment->id}"
    );

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data['overall_status'])->toBe('compliant');
});

it('missing mandatory cert type triggers non_compliant', function () {
    EquipmentCertType::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Mandatory Cert',
        'slug' => 'mandatory-cert',
        'is_mandatory' => true,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/compliance/equipment/{$this->equipment->id}"
    );

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data['overall_status'])->toBe('non_compliant');
});

it('non-mandatory cert does not affect compliance', function () {
    EquipmentCertType::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Optional Cert',
        'slug' => 'optional-cert',
        'is_mandatory' => false,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/compliance/equipment/{$this->equipment->id}"
    );

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data['overall_status'])->toBe('compliant');
    expect($data['compliance_score'])->toBe(100.0);
});

it('fails with 422 cert record requires equipment_cert_type_id', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$this->equipment->id}/cert-records",
        [
            'cert_number' => 'CERT-BAD',
            'issued_at' => '2024-01-01',
        ]
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['equipment_cert_type_id']);
});

it('fails with 422 cert type requires unique slug', function () {
    EquipmentCertType::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'First',
        'slug' => 'duplicate-slug',
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/equipment/{$this->equipment->id}/cert-types",
        [
            'name' => 'Second',
            'slug' => 'duplicate-slug',
        ]
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['slug']);
});
