<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

// The CI test database is pre-migrated by the deployment pipeline, so the
// RefreshDatabase trait does not need to run `migrate:fresh` between test
// runs. Setting $migrated = true here causes the trait to skip its initial
// migration and only wrap each test in a transaction.
beforeAll(function () {
    RefreshDatabaseState::$migrated = true;
});

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->workspace = Workspace::factory()->create([
        'owner_id' => $this->owner->id,
        'plan' => 'growth',
        'storage_quota_bytes' => 25 * 1024 * 1024 * 1024, // 25 GB
        'storage_used_bytes' => 0,
    ]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'role' => 'owner',
    ]);

    Sanctum::actingAs($this->owner);
});

it('returns 200 with the expected storage shape for the owner', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/storage");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'workspace_id',
                'used_bytes',
                'quota_bytes',
                'percent_used',
                'breakdown' => [
                    'files' => ['count', 'bytes', 'last_activity'],
                    'avatars' => ['count', 'bytes', 'last_activity'],
                    'exports' => ['count', 'bytes', 'last_activity'],
                ],
            ],
        ]);

    expect($response->json('data.workspace_id'))->toBe($this->workspace->id);
    expect($response->json('data.used_bytes'))->toBe(0);
    expect((int) $response->json('data.quota_bytes'))->toBe(25 * 1024 * 1024 * 1024);
    expect((float) $response->json('data.percent_used'))->toBe(0.0);
});

it('returns 403 for a non-member of the workspace', function () {
    $stranger = User::factory()->create();
    Sanctum::actingAs($stranger);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/storage");

    $response->assertStatus(403);
});

it('computes percent_used against the workspace quota', function () {
    DB::table('files')->insert([
        'id' => Str::uuid()->toString(),
        'workspace_id' => $this->workspace->id,
        'entity_type' => 'item',
        'entity_id' => Str::uuid()->toString(),
        'name' => 'big.bin',
        'mime_type' => 'application/octet-stream',
        'size_bytes' => 5 * 1024 * 1024 * 1024, // 5 GB
        'storage_path' => "workspaces/{$this->workspace->id}/items/abc/big.bin",
        'uploaded_by' => $this->owner->id,
        'created_at' => now(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/storage");

    $response->assertStatus(200);
    // 5 GB used / 25 GB quota = 20%
    expect($response->json('data.used_bytes'))->toBe(5 * 1024 * 1024 * 1024);
    expect((float) $response->json('data.percent_used'))->toBe(20.0);
});
