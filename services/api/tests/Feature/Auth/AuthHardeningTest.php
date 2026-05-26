<?php

use App\Core\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    Event::fake([Verified::class]);
});

it('blocks unverified email from accessing protected routes', function () {
    $user = User::factory()->create([
        'email_verified_at' => null,
        'password_hash' => bcrypt('SecurePass123!'),
    ]);

    $token = $user->createToken('auth', ['*'], now()->addDays(30))->plainTextToken;

    $response = $this->withToken($token)->postJson('/api/auth/mfa/enable', [], ['Idempotency-Key' => 'test-key-1']);

    $response->assertStatus(403)
        ->assertJsonPath('error.code', 'EMAIL_NOT_VERIFIED');
});

it('allows verified user to access protected routes', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'password_hash' => bcrypt('SecurePass123!'),
    ]);

    $token = $user->createToken('auth', ['*'], now()->addDays(30))->plainTextToken;

    $response = $this->withToken($token)->getJson('/api/me');

    $response->assertStatus(200)
        ->assertJsonPath('data.email', $user->email);
});

it('login response includes expires_at', function () {
    User::factory()->create([
        'email' => 'expiry@example.com',
        'password_hash' => bcrypt('SecurePass123!'),
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => 'expiry@example.com',
        'password' => 'SecurePass123!',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['token', 'user', 'expires_at']]);
});

it('register response includes expires_at', function () {
    $response = $this->postJson('/api/auth/register', [
        'name' => 'Expiry Test',
        'email' => 'expiry-reg@example.com',
        'password' => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
        'workspace_name' => 'Expiry Workspace',
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['data' => ['user', 'workspace', 'token', 'expires_at']]);
});

it('refresh token rotates and returns new expiry', function () {
    $user = User::factory()->create([
        'email' => 'refresh@example.com',
        'password_hash' => bcrypt('SecurePass123!'),
        'email_verified_at' => now(),
    ]);

    $loginResponse = $this->postJson('/api/auth/login', [
        'email' => 'refresh@example.com',
        'password' => 'SecurePass123!',
    ]);
    $loginResponse->assertStatus(200);
    $oldToken = $loginResponse->json('data.token');

    $refreshResponse = $this->postJson('/api/auth/refresh', [
        'token' => $oldToken,
    ]);

    $refreshResponse->assertStatus(200)
        ->assertJsonStructure(['data' => ['token', 'expires_at']]);

    $newToken = $refreshResponse->json('data.token');
    expect($newToken)->not->toBe($oldToken);

    // Old token should be revoked
    Auth::forgetGuards();
    $this->withToken($oldToken)->getJson('/api/me')->assertStatus(401);

    // New token should work
    $this->withToken($newToken)->getJson('/api/me')->assertStatus(200);
});

it('resend verification endpoint returns success silently', function () {
    User::factory()->create([
        'email' => 'unverified@example.com',
        'email_verified_at' => null,
    ]);

    $response = $this->postJson('/api/auth/verify-email/resend', [
        'email' => 'unverified@example.com',
    ]);

    $response->assertStatus(200);
});

it('resend verification does not reveal if email exists', function () {
    $response = $this->postJson('/api/auth/verify-email/resend', [
        'email' => 'nonexistent@example.com',
    ]);

    $response->assertStatus(200);
});

it('verify email marks user as verified', function () {
    $user = User::factory()->create([
        'email_verified_at' => null,
    ]);

    $hash = sha1($user->email);

    $response = $this->postJson("/api/auth/verify-email/{$user->id}/{$hash}");

    $response->assertStatus(200);

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        // email_verified_at should be set (not null)
    ]);

    $user->refresh();
    expect($user->email_verified_at)->not->toBeNull();

    Event::assertDispatched(Verified::class, function ($event) use ($user) {
        return $event->user->id === $user->id;
    });
});
