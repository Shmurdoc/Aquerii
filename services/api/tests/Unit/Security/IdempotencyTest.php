<?php

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;

/**
 * Helper: obtain a real Sanctum token by logging in.
 * Sanctum::actingAs() only acts for the FIRST request in a test;
 * subsequent requests lose the auth context. We must use a real Bearer token.
 */
function loginAndGetToken(string $email, string $password): string
{
    $response = test()->postJson('/api/auth/login', compact('email', 'password'));
    $response->assertStatus(200);
    return $response->json('data.token');
}

it('returns same response for repeated idempotency key', function () {
    $user = User::factory()->create([
        'email'         => 'idempotency1@example.com',
        'password_hash' => bcrypt('SecurePass123!'),
    ]);
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id'      => $user->id,
        'role'         => 'owner',
    ]);

    $token = loginAndGetToken('idempotency1@example.com', 'SecurePass123!');

    $key  = \Illuminate\Support\Str::uuid()->toString();
    $body = ['name' => 'Idempotent Board'];

    $r1 = $this->withToken($token)->postJson(
        "/api/workspaces/{$workspace->id}/boards",
        $body,
        ['Idempotency-Key' => $key]
    );
    $r2 = $this->withToken($token)->postJson(
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
    $user = User::factory()->create([
        'email'         => 'idempotency2@example.com',
        'password_hash' => bcrypt('SecurePass123!'),
    ]);
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id'      => $user->id,
        'role'         => 'owner',
    ]);

    $token = loginAndGetToken('idempotency2@example.com', 'SecurePass123!');

    $response = $this->withToken($token)->postJson("/api/workspaces/{$workspace->id}/boards", [
        'name' => 'No Key Board',
    ]);

    $response->assertStatus(400)
             ->assertJsonPath('error.code', 'MISSING_IDEMPOTENCY_KEY');
});

it('returns 409 when same key is reused with a different payload', function () {
    $user = User::factory()->create([
        'email'         => 'idempotency3@example.com',
        'password_hash' => bcrypt('SecurePass123!'),
    ]);
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id'      => $user->id,
        'role'         => 'owner',
    ]);

    $token = loginAndGetToken('idempotency3@example.com', 'SecurePass123!');
    $key   = \Illuminate\Support\Str::uuid()->toString();

    $this->withToken($token)->postJson(
        "/api/workspaces/{$workspace->id}/boards",
        ['name' => 'First Board'],
        ['Idempotency-Key' => $key]
    )->assertStatus(201);

    $response = $this->withToken($token)->postJson(
        "/api/workspaces/{$workspace->id}/boards",
        ['name' => 'Different Payload Board'],
        ['Idempotency-Key' => $key]
    );

    $response->assertStatus(409)
             ->assertJsonPath('error.code', 'IDEMPOTENCY_CONFLICT');
});
