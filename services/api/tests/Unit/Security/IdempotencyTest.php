<?php

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Laravel\Sanctum\Sanctum;

it('returns same response for repeated idempotency key', function () {
    $user      = User::factory()->create();
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id'      => $user->id,
        'role'         => 'owner',
    ]);
    Sanctum::actingAs($user);

    $key  = \Illuminate\Support\Str::uuid()->toString();
    $body = ['name' => 'Idempotent Board'];

    $r1 = $this->postJson(
        "/api/workspaces/{$workspace->id}/boards",
        $body,
        ['Idempotency-Key' => $key]
    );
    $r2 = $this->postJson(
        "/api/workspaces/{$workspace->id}/boards",
        $body,
        ['Idempotency-Key' => $key]
    );

    $r1->assertStatus(201);
    $r2->assertStatus(201);
    expect($r1->json('data.id'))->toBe($r2->json('data.id'));

    // Only one board should exist in the database
    $this->assertDatabaseCount('boards', 1);
});

it('returns 400 when Idempotency-Key header is missing on a mutating request', function () {
    $user      = User::factory()->create();
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id'      => $user->id,
        'role'         => 'owner',
    ]);
    Sanctum::actingAs($user);

    // POST to a route that has `idempotent` middleware — register does, boards/store does
    $response = $this->postJson("/api/workspaces/{$workspace->id}/boards", [
        'name' => 'No Key Board',
        // No Idempotency-Key header
    ]);

    $response->assertStatus(400)
             ->assertJsonPath('error.code', 'MISSING_IDEMPOTENCY_KEY');
});

it('returns 409 when same key is reused with a different payload', function () {
    $user      = User::factory()->create();
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id'      => $user->id,
        'role'         => 'owner',
    ]);
    Sanctum::actingAs($user);

    $key = \Illuminate\Support\Str::uuid()->toString();

    $this->postJson(
        "/api/workspaces/{$workspace->id}/boards",
        ['name' => 'First Board'],
        ['Idempotency-Key' => $key]
    )->assertStatus(201);

    $response = $this->postJson(
        "/api/workspaces/{$workspace->id}/boards",
        ['name' => 'Different Payload Board'],
        ['Idempotency-Key' => $key]
    );

    $response->assertStatus(409)
             ->assertJsonPath('error.code', 'IDEMPOTENCY_CONFLICT');
});
