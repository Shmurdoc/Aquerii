<?php

use App\Models\User;
use App\Models\Workspace;

it('registers a new user successfully', function () {
    $response = $this->postJson('/api/auth/register', [
        'name'                  => 'Test User',
        'email'                 => 'test@example.com',
        'password'              => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
        'workspace_name'        => 'Test Workspace',
    ]);

    $response->assertStatus(201)
             ->assertJsonStructure(['data' => ['user', 'token', 'workspace']]);

    $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
});

it('creates a default workspace on registration', function () {
    $response = $this->postJson('/api/auth/register', [
        'name'                  => 'Test User',
        'email'                 => 'ws@example.com',
        'password'              => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
        'workspace_name'        => 'My Company',
    ]);

    $response->assertStatus(201);

    $this->assertDatabaseHas('workspaces', ['name' => 'My Company']);
});

it('rejects duplicate email registration', function () {
    User::factory()->create(['email' => 'existing@example.com']);

    $response = $this->postJson('/api/auth/register', [
        'name'                  => 'Another User',
        'email'                 => 'existing@example.com',
        'password'              => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
        'workspace_name'        => 'Another Workspace',
    ]);

    $response->assertStatus(422);
});

it('rejects mismatched password confirmation', function () {
    $response = $this->postJson('/api/auth/register', [
        'name'                  => 'Test User',
        'email'                 => 'test3@example.com',
        'password'              => 'SecurePass123!',
        'password_confirmation' => 'DifferentPass123!',
        'workspace_name'        => 'Test Workspace',
    ]);

    $response->assertStatus(422);
});

it('rejects registration with missing required fields', function () {
    $response = $this->postJson('/api/auth/register', [
        'email' => 'incomplete@example.com',
    ]);

    $response->assertStatus(422);
});
