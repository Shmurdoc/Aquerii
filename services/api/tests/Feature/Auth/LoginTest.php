<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('logs in with correct credentials', function () {
    User::factory()->create([
        'email'         => 'login@example.com',
        'password_hash' => bcrypt('SecurePass123!'),
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email'    => 'login@example.com',
        'password' => 'SecurePass123!',
    ]);

    $response->assertStatus(200)
             ->assertJsonStructure(['data' => ['token', 'user']]);
});

it('rejects invalid credentials', function () {
    User::factory()->create([
        'email'         => 'user@example.com',
        'password_hash' => bcrypt('rightpass'),
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email'    => 'user@example.com',
        'password' => 'wrongpass',
    ]);

    $response->assertStatus(401);
});

it('rejects login for non-existent user', function () {
    $response = $this->postJson('/api/auth/login', [
        'email'    => 'nobody@example.com',
        'password' => 'AnyPass123!',
    ]);

    $response->assertStatus(401);
});

it('returns unauthenticated for protected routes without token', function () {
    $response = $this->getJson('/api/me');
    $response->assertStatus(401);
});

it('returns current user when authenticated', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $response = $this->getJson('/api/me');
    $response->assertStatus(200)
             ->assertJsonPath('data.email', $user->email);
});

it('logs out and invalidates token', function () {
    $user = User::factory()->create([
        'email'         => 'logout@example.com',
        'password_hash' => bcrypt('SecurePass123!'),
    ]);

    // Obtain a real Sanctum token via login
    $loginResponse = $this->postJson('/api/auth/login', [
        'email'    => 'logout@example.com',
        'password' => 'SecurePass123!',
    ]);
    $loginResponse->assertStatus(200);
    $token = $loginResponse->json('data.token');

    // Token should exist in DB — at least one token for this user
    $this->assertDatabaseHas('personal_access_tokens', [
        'tokenable_type' => App\Models\User::class,
        'tokenable_id'   => $user->id,
    ]);

    // Record token count before logout
    $countBefore = \Laravel\Sanctum\PersonalAccessToken::where('tokenable_id', $user->id)->count();
    expect($countBefore)->toBeGreaterThanOrEqual(1);

    // Logout with the real token
    $logoutResponse = $this->withToken($token)->postJson('/api/auth/logout');
    $logoutResponse->assertStatus(200);

    // All tokens for this user must be revoked after logout
    $countAfter = \Laravel\Sanctum\PersonalAccessToken::where('tokenable_id', $user->id)->count();
    expect($countAfter)->toBe(0);

    // Laravel's RequestGuard caches the authenticated user after the first resolution
    // and does NOT clear it when the request object is replaced. Resetting the resolved
    // guards forces a fresh token lookup for the next request, ensuring we actually test
    // that the revoked token is rejected rather than seeing the cached auth state.
    \Illuminate\Support\Facades\Auth::forgetGuards();

    // Subsequent requests with the revoked token must be rejected
    $this->withToken($token)->getJson('/api/me')->assertStatus(401);
});
