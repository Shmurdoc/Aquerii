<?php

use App\Core\Models\Board;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->member = User::factory()->create();

    $this->workspace = Workspace::factory()->create([
        'owner_id' => $this->owner->id,
        'plan' => 'enterprise',
    ]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'role' => 'owner',
        'status' => 'active',
    ]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->member->id,
        'role' => 'member',
        'status' => 'active',
    ]);
});

it('returns enriched command-center search sections', function () {
    Sanctum::actingAs($this->owner);

    Board::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Growth Report Board',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/search?q=report");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data',
            'sections' => [
                ['key', 'label', 'items'],
            ],
        ]);

    $types = collect($response->json('data'))->pluck('type')->unique()->values()->all();

    expect($types)->toContain('report')
        ->and($types)->toContain('module');
});

it('allows workspace owner to read audit logs', function () {
    Sanctum::actingAs($this->owner);

    DB::table('audit_logs')->insert([
        'id' => (string) Str::uuid(),
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'action' => 'security.test_event',
        'resource_type' => 'workspace',
        'resource_id' => $this->workspace->id,
        'before' => json_encode(['state' => 'before']),
        'after' => json_encode(['state' => 'after']),
        'meta' => json_encode(['source' => 'test']),
        'ip_address' => '127.0.0.1',
        'user_agent' => 'pest',
        'created_at' => now(),
    ]);

    $this->getJson("/api/workspaces/{$this->workspace->id}/audit-logs")
        ->assertStatus(200)
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.action', 'security.test_event');
});

it('blocks non-admin member from reading audit logs', function () {
    Sanctum::actingAs($this->member);

    $this->getJson("/api/workspaces/{$this->workspace->id}/audit-logs")
        ->assertStatus(403);
});
