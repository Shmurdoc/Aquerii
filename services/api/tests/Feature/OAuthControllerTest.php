<?php

use App\Core\Models\OAuthAccount;
use App\Core\Models\User;
use Illuminate\Support\Facades\Crypt;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialUser;

beforeEach(function () {
    $this->user = User::factory()->create(['email' => 'oauth-test@example.com']);
});

test('redirect returns 302 for supported provider', function () {
    Socialite::shouldReceive('driver')
        ->with('google')
        ->andReturnSelf();

    Socialite::shouldReceive('stateless')
        ->andReturnSelf();

    Socialite::shouldReceive('redirect')
        ->andReturn(redirect('https://accounts.google.com/o/oauth2/auth'));

    $response = $this->getJson('/api/auth/oauth/google');
    $response->assertStatus(302);
});

test('callback returns 404 for unsupported provider', function () {
    $response = $this->getJson('/api/auth/oauth/tiktok/callback');
    $response->assertStatus(404);
});

test('callback creates user and returns token for new OAuth user', function () {
    $socialUser = Mockery::mock(SocialUser::class);
    $socialUser->shouldReceive('getId')->andReturn('google_12345');
    $socialUser->shouldReceive('getEmail')->andReturn('new-oauth@example.com');
    $socialUser->shouldReceive('getName')->andReturn('New OAuth User');
    $socialUser->shouldReceive('getNickname')->andReturn(null);
    $socialUser->shouldReceive('getAvatar')->andReturn('https://example.com/avatar.png');
    $socialUser->shouldReceive('token')->andReturn('oauth_token_123');
    $socialUser->shouldReceive('refreshToken')->andReturn(null);
    $socialUser->shouldReceive('expiresIn')->andReturn(3600);

    Socialite::shouldReceive('driver')
        ->with('google')
        ->andReturnSelf();

    Socialite::shouldReceive('stateless')
        ->andReturnSelf();

    Socialite::shouldReceive('user')
        ->andReturn($socialUser);

    $response = $this->getJson('/api/auth/oauth/google/callback');
    $response->assertStatus(200);
    $response->assertJsonStructure(['data' => ['token', 'is_new', 'user']]);
    expect($response->json('data.is_new'))->toBeTrue();
    expect($response->json('data.user.email'))->toBe('new-oauth@example.com');
});

test('callback returns existing user token for returning OAuth user', function () {
    $existingUser = User::factory()->create(['email' => 'existing-oauth@example.com']);

    OAuthAccount::create([
        'user_id' => $existingUser->id,
        'provider' => 'github',
        'provider_id' => 'github_67890',
        'access_token' => Crypt::encryptString('old_token'),
    ]);

    $socialUser = Mockery::mock(SocialUser::class);
    $socialUser->shouldReceive('getId')->andReturn('github_67890');
    $socialUser->shouldReceive('getEmail')->andReturn('existing-oauth@example.com');
    $socialUser->shouldReceive('getName')->andReturn(null);
    $socialUser->shouldReceive('getNickname')->andReturn('existinguser');
    $socialUser->shouldReceive('getAvatar')->andReturn(null);
    $socialUser->shouldReceive('token')->andReturn('new_oauth_token');
    $socialUser->shouldReceive('refreshToken')->andReturn('new_refresh_token');
    $socialUser->shouldReceive('expiresIn')->andReturn(7200);

    Socialite::shouldReceive('driver')
        ->with('github')
        ->andReturnSelf();

    Socialite::shouldReceive('stateless')
        ->andReturnSelf();

    Socialite::shouldReceive('user')
        ->andReturn($socialUser);

    $response = $this->getJson('/api/auth/oauth/github/callback');
    $response->assertStatus(200);
    $response->assertJsonStructure(['data' => ['token', 'is_new', 'user']]);
    expect($response->json('data.is_new'))->toBeFalse();
    expect($response->json('data.user.email'))->toBe('existing-oauth@example.com');
});

test('callback returns 401 when OAuth provider throws', function () {
    Socialite::shouldReceive('driver')
        ->with('google')
        ->andReturnSelf();

    Socialite::shouldReceive('stateless')
        ->andReturnSelf();

    Socialite::shouldReceive('user')
        ->andThrow(new \Exception('Provider unavailable'));

    $response = $this->getJson('/api/auth/oauth/google/callback');
    $response->assertStatus(401);
    $response->assertJsonPath('error.code', 'OAUTH_FAILED');
});
