<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Models\GateKiosk;
use App\Models\SiteAccessLog;
use App\Modules\Competency\Models\CofRecord;
use Illuminate\Support\Facades\DB;
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

    $this->worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create(['name' => 'John Doe'])->id,
        'role' => 'member',
        'status' => 'active',
    ]);

    CofRecord::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->worker->user_id,
        'type' => 'fitness',
        'status' => 'active',
        'issued_at' => now()->subMonth(),
        'expires_at' => now()->addYear(),
        'verified_at' => now(),
    ]);

    DB::table('training_records')->insert([
        'id' => Str::uuid()->toString(),
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->worker->user_id,
        'training_name' => 'Site Induction',
        'date_completed' => now()->subMonths(6),
        'expiry_date' => now()->addMonths(6),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
});

it('scans a compliant worker entry', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/gate/scan",
        [
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
            'method' => 'qr_scan',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('status', 'compliant')
        ->assertJsonStructure([
            'status', 'worker' => ['name', 'photo_url'], 'compliance' => ['status', 'failures', 'checked_at'],
        ]);

    $this->assertDatabaseHas('site_access_logs', [
        'worker_id' => $this->worker->id,
        'direction' => 'entry',
        'method' => 'qr_scan',
    ]);
});

it('scans an entry with exit direction', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/gate/scan",
        [
            'worker_id' => $this->worker->id,
            'direction' => 'exit',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('status', 'compliant')
        ->assertJsonPath('worker.name', 'John Doe');
});

it('scans with manual override and records reason', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/gate/scan",
        [
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
            'method' => 'manual_override',
            'override_reason' => 'Badge damaged, verified ID manually',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('status', 'compliant');

    $this->assertDatabaseHas('site_access_logs', [
        'worker_id' => $this->worker->id,
        'method' => 'manual_override',
        'override_reason' => 'Badge damaged, verified ID manually',
    ]);
});

it('returns non-compliant for worker with expired competency records', function () {
    $competencyTypeId = Str::uuid()->toString();
    DB::table('competency_types')->insert([
        'id' => $competencyTypeId,
        'workspace_id' => $this->workspace->id,
        'name' => 'Safety Training',
    ]);
    DB::table('competency_records')->insert([
        'id' => Str::uuid()->toString(),
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->worker->user_id,
        'competency_type_id' => $competencyTypeId,
        'status' => 'active',
        'issued_at' => now()->subYear(),
        'expires_at' => now()->subDay(),
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/gate/scan",
        [
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('status', 'non_compliant')
        ->assertJsonPath('compliance.status', 'non_compliant');
});

it('authenticates via kiosk API key', function () {
    $plaintextKey = Str::random(32);
    $hashedKey = hash('sha256', $plaintextKey);

    GateKiosk::create([
        'id' => Str::uuid()->toString(),
        'workspace_id' => $this->workspace->id,
        'name' => 'Main Gate Kiosk',
        'api_key' => $hashedKey,
        'allowed_sites' => ['main_gate'],
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/gate/scan",
        [
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
        ],
        ['X-API-Key' => $plaintextKey]
    );

    $response->assertStatus(200)
        ->assertJsonPath('status', 'compliant');
});

it('rejects scan with invalid worker_id', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/gate/scan",
        [
            'worker_id' => Str::uuid()->toString(),
            'direction' => 'entry',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(404);
});

it('paginates access logs', function () {
    SiteAccessLog::insert([
        [
            'id' => Str::uuid()->toString(),
            'workspace_id' => $this->workspace->id,
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
            'timestamp' => now()->subHours(2),
            'method' => 'qr_scan',
            'compliance_snapshot' => json_encode(['is_compliant' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => Str::uuid()->toString(),
            'workspace_id' => $this->workspace->id,
            'worker_id' => $this->worker->id,
            'direction' => 'exit',
            'timestamp' => now()->subHour(),
            'method' => 'qr_scan',
            'compliance_snapshot' => json_encode(['is_compliant' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/gate/logs?per_page=1");

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonStructure(['data', 'current_page', 'per_page', 'total']);
});

it('filters access logs by direction', function () {
    SiteAccessLog::insert([
        [
            'id' => Str::uuid()->toString(),
            'workspace_id' => $this->workspace->id,
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
            'timestamp' => now()->subHours(2),
            'method' => 'qr_scan',
            'compliance_snapshot' => json_encode(['is_compliant' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => Str::uuid()->toString(),
            'workspace_id' => $this->workspace->id,
            'worker_id' => $this->worker->id,
            'direction' => 'exit',
            'timestamp' => now()->subHour(),
            'method' => 'id_scan',
            'compliance_snapshot' => json_encode(['is_compliant' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/gate/logs?direction=exit");

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.direction', 'exit');
});

it('returns today stats', function () {
    SiteAccessLog::insert([
        [
            'id' => Str::uuid()->toString(),
            'workspace_id' => $this->workspace->id,
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
            'timestamp' => now(),
            'method' => 'qr_scan',
            'compliance_snapshot' => json_encode(['is_compliant' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => Str::uuid()->toString(),
            'workspace_id' => $this->workspace->id,
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
            'timestamp' => now(),
            'method' => 'qr_scan',
            'compliance_snapshot' => json_encode(['is_compliant' => false]),
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => Str::uuid()->toString(),
            'workspace_id' => $this->workspace->id,
            'worker_id' => $this->worker->id,
            'direction' => 'exit',
            'timestamp' => now(),
            'method' => 'qr_scan',
            'compliance_snapshot' => json_encode(['is_compliant' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/gate/stats");

    $response->assertStatus(200)
        ->assertJsonPath('data.entries', 2)
        ->assertJsonPath('data.exits', 1)
        ->assertJsonPath('data.non_compliant_attempts', 1)
        ->assertJsonStructure(['data' => ['entries', 'exits', 'non_compliant_attempts', 'compliance_rate']]);
});

it('lists kiosk tokens for owner', function () {
    GateKiosk::create([
        'id' => Str::uuid()->toString(),
        'workspace_id' => $this->workspace->id,
        'name' => 'Kiosk 1',
        'api_key' => hash('sha256', 'test-key-1'),
        'allowed_sites' => ['site_a'],
    ]);

    GateKiosk::create([
        'id' => Str::uuid()->toString(),
        'workspace_id' => $this->workspace->id,
        'name' => 'Kiosk 2',
        'api_key' => hash('sha256', 'test-key-2'),
        'allowed_sites' => ['site_b'],
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/gate/kiosk-tokens");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Kiosk 1')
        ->assertJsonPath('data.1.name', 'Kiosk 2');
});

it('returns empty logs when no access records exist', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/gate/logs");

    $response->assertStatus(200)
        ->assertJsonCount(0, 'data');
});
