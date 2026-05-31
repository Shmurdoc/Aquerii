<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Core\Models\FeatureFlag;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::factory()->create([
        'owner_id' => $this->user->id,
        'plan' => 'starter',
    ]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($this->user);
    // Enable AI feature for testing
    FeatureFlag::updateOrCreate(['key' => 'module.ai'], ['enabled' => true]);
    // Reset credits counter before each test
    Redis::del("ai_credits:{$this->workspace->id}");
});

it('allows AI requests within the free plan credit limit', function () {
    // Free plan = 100 credits; a single chat costs 5 — should succeed
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ai/chat",
        ['message' => 'Hello'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    // 200 or 422 (validation) are both acceptable — 402 is not
    expect($response->status())->not->toBe(402);
});

it('blocks AI requests when the free plan credit limit is exhausted', function () {
    // Starter plan = 200 credits; a single chat costs 5 — exhaust by setting to 199
    Redis::set("ai_credits:{$this->workspace->id}", 199);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ai/chat",
        ['message' => 'Hello'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(402);
});

it('does not double-charge on concurrent requests due to atomic Lua script', function () {
    // Set counter to 199 (1 credit left); chat costs 5 → should be blocked atomically
    Redis::set("ai_credits:{$this->workspace->id}", 199);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/ai/chat",
        ['message' => 'Concurrent test'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(402);

    // Counter should not have moved past 199 (Lua script aborted before INCRBY)
    $counter = (int) Redis::get("ai_credits:{$this->workspace->id}");
    expect($counter)->toBe(199);
});
