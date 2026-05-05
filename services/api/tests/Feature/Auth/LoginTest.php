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
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $response = $this->postJson('/api/auth/logout');
    $response->assertStatus(200);

    // Token should now be invalid
    $this->assertDatabaseCount('personal_access_tokens', 0);
});
