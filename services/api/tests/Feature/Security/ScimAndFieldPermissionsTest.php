<?php

use App\Core\Models\ScimToken;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
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

it('allows owner to create field permissions', function () {
    Sanctum::actingAs($this->owner);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/field-permissions",
        [
            'entity_type' => 'item',
            'field_name' => 'salary',
            'role' => 'viewer',
            'permission' => 'hidden',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.workspace_id', $this->workspace->id)
        ->assertJsonPath('data.permission', 'hidden');
});

it('blocks non-admin member from creating field permissions', function () {
    Sanctum::actingAs($this->member);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/field-permissions",
        [
            'entity_type' => 'item',
            'field_name' => 'salary',
            'role' => 'viewer',
            'permission' => 'hidden',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(403);
});

it('blocks non-admin member from managing scim tokens', function () {
    Sanctum::actingAs($this->member);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/scim/tokens",
        ['name' => 'idp', 'scope' => 'users'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(403);
});

it('provisions user via scim v2 users endpoint using bearer token scope users', function () {
    Sanctum::actingAs($this->owner);

    $tokenResp = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/scim/tokens",
        ['name' => 'okta-prod', 'scope' => 'users,groups'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $tokenResp->assertStatus(201);
    $rawScimToken = $tokenResp->json('token');

    $this->withHeader('Authorization', 'Bearer '.$rawScimToken)
        ->postJson('/api/scim/v2/Users', [
            'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:User'],
            'externalId' => 'okta-user-1001',
            'userName' => 'scim-user@example.com',
            'name' => ['givenName' => 'Scim', 'familyName' => 'User'],
            'active' => true,
        ], ['Idempotency-Key' => Str::uuid()->toString()])
        ->assertStatus(201)
        ->assertJsonPath('userName', 'scim-user@example.com');

    $this->assertDatabaseHas('users', ['email' => 'scim-user@example.com']);
    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $this->workspace->id,
        'status' => 'active',
    ]);
    $this->assertDatabaseHas('scim_identities', [
        'workspace_id' => $this->workspace->id,
        'external_id' => 'okta-user-1001',
    ]);
});

it('rejects scim users provisioning when token scope does not include users', function () {
    Sanctum::actingAs($this->owner);

    $tokenResp = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/scim/tokens",
        ['name' => 'groups-only', 'scope' => 'groups'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $tokenResp->assertStatus(201);
    $rawScimToken = $tokenResp->json('token');

    $this->withHeader('Authorization', 'Bearer '.$rawScimToken)
        ->postJson('/api/scim/v2/Users', [
            'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:User'],
            'userName' => 'blocked-by-scope@example.com',
        ], ['Idempotency-Key' => Str::uuid()->toString()])
        ->assertStatus(403);
});

it('rejects scim v2 requests with invalid token', function () {
    $this->withHeader('Authorization', 'Bearer invalid-token')
        ->getJson('/api/scim/v2/ServiceProviderConfig')
        ->assertStatus(401);
});

it('updates scim token last_used_at when verifying token on scim endpoint', function () {
    Sanctum::actingAs($this->owner);

    $tokenResp = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/scim/tokens",
        ['name' => 'usage-check', 'scope' => 'users'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $tokenResp->assertStatus(201);
    $rawScimToken = $tokenResp->json('token');

    $token = ScimToken::where('workspace_id', $this->workspace->id)
        ->where('name', 'usage-check')
        ->firstOrFail();

    expect($token->last_used_at)->toBeNull();

    $this->withHeader('Authorization', 'Bearer '.$rawScimToken)
        ->getJson('/api/scim/v2/ServiceProviderConfig')
        ->assertStatus(200);

    $token->refresh();
    expect($token->last_used_at)->not->toBeNull();
});
