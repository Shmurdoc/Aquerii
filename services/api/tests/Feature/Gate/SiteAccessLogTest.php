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
        'status' => 'active',
    ]);
    Sanctum::actingAs($this->user);

    $this->worker = WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create(['name' => 'Gate Worker'])->id,
        'role' => 'member',
        'status' => 'active',
    ]);
});

it('creates a scan entry returning 200 with compliant status', function () {
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
        ->assertJsonStructure(['status', 'worker', 'compliance']);

    $this->assertDatabaseHas('site_access_logs', [
        'worker_id' => $this->worker->id,
        'direction' => 'entry',
        'method' => 'qr_scan',
    ]);
});

it('lists logs paginated with correct structure', function () {
    SiteAccessLog::insert([
        [
            'id' => Str::uuid()->toString(),
            'workspace_id' => $this->workspace->id,
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
            'timestamp' => now()->subHours(3),
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
            'timestamp' => now()->subHours(2),
            'method' => 'id_scan',
            'compliance_snapshot' => json_encode(['is_compliant' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => Str::uuid()->toString(),
            'workspace_id' => $this->workspace->id,
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
            'timestamp' => now()->subHour(),
            'method' => 'manual_override',
            'compliance_snapshot' => json_encode(['is_compliant' => false]),
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/gate/logs?per_page=2");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure(['data', 'current_page', 'per_page', 'total']);
});

it('returns today stats with counts', function () {
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
            'direction' => 'exit',
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
            'method' => 'id_scan',
            'compliance_snapshot' => json_encode(['is_compliant' => false]),
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

it('authenticates via valid kiosk API key and rejects invalid key', function () {
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

    $plaintextKey = Str::random(32);
    $hashedKey = hash('sha256', $plaintextKey);

    GateKiosk::create([
        'id' => Str::uuid()->toString(),
        'workspace_id' => $this->workspace->id,
        'name' => 'Main Gate',
        'api_key' => $hashedKey,
        'allowed_sites' => ['main_gate'],
    ]);

    $this->app['auth']->forgetGuards();
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/gate/scan",
        [
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
        ],
        ['X-API-Key' => 'invalid-key-that-will-not-match']
    )->assertStatus(401);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/gate/scan",
        [
            'worker_id' => $this->worker->id,
            'direction' => 'entry',
        ],
        ['X-API-Key' => $plaintextKey]
    )->assertStatus(200)
        ->assertJsonPath('status', 'compliant');
});

it('returns non-compliant result for worker with expired competency', function () {
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
        ->assertJsonCount(1, 'compliance.failures');
});
