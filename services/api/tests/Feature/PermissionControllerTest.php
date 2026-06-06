<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Laravel\Sanctum\Sanctum;

it('returns the employee fallback for a default user', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $user->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($user);

    $response = $this->getJson('/api/me/permissions');

    $response->assertOk();
    $response->assertJsonStructure([
        'data' => ['permissions', 'roles', 'account_type'],
    ]);
    expect($response->json('data.account_type'))->toBe('employee');
    expect($response->json('data.permissions'))->toBe([]);
    expect($response->json('data.roles'))->toBe([]);
});

it('returns the superadmin wildcard for a superadmin_creator user', function () {
    $user = User::factory()->create(['account_type' => 'superadmin_creator']);
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $user->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($user);

    $response = $this->getJson('/api/me/permissions');

    $response->assertOk();
    expect($response->json('data.account_type'))->toBe('superadmin_creator');
    expect($response->json('data.permissions'))->toContain('*.*');
    expect($response->json('data.roles'))->toContain('superadmin-creator');
});

it('returns the subscriber owner set for a subscriber user', function () {
    $user = User::factory()->create(['account_type' => 'subscriber']);
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $user->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($user);

    $response = $this->getJson('/api/me/permissions');

    $response->assertOk();
    expect($response->json('data.account_type'))->toBe('subscriber');
    expect($response->json('data.permissions'))->toContain('workspace.*');
    expect($response->json('data.permissions'))->toContain('billing.*');
    expect($response->json('data.roles'))->toContain('subscriber');
});

it('returns admin extras for a platform_admin user', function () {
    $user = User::factory()->create(['account_type' => 'platform_admin']);
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $user->id,
        'role' => 'admin',
    ]);
    Sanctum::actingAs($user);

    $response = $this->getJson('/api/me/permissions');

    $response->assertOk();
    expect($response->json('data.account_type'))->toBe('platform_admin');
    expect($response->json('data.permissions'))->toContain('admin.*');
    expect($response->json('data.roles'))->toContain('platform-admin');
});

it('rejects unauthenticated requests', function () {
    $response = $this->getJson('/api/me/permissions');

    $response->assertStatus(401);
});
