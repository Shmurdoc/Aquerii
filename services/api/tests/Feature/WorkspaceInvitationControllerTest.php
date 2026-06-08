<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceInvitation;
use App\Core\Models\WorkspaceMember;
use App\Mail\WorkspaceInvite;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Mail::fake();
    $this->user = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($this->user);
});

it('creates an invitation and queues the email', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/invitations",
        ['email' => 'test@example.com', 'role' => 'member'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.email', 'test@example.com');

    $this->assertDatabaseHas('workspace_invitations', [
        'workspace_id' => $this->workspace->id,
        'email' => 'test@example.com',
    ]);

    Mail::assertQueued(WorkspaceInvite::class);
});

it('lists pending invitations', function () {
    WorkspaceInvitation::create([
        'workspace_id' => $this->workspace->id,
        'email' => 'first@example.com',
        'token' => Str::uuid()->toString(),
        'invited_by' => $this->user->name,
        'expires_at' => now()->addDays(7),
    ]);
    WorkspaceInvitation::create([
        'workspace_id' => $this->workspace->id,
        'email' => 'second@example.com',
        'token' => Str::uuid()->toString(),
        'invited_by' => $this->user->name,
        'expires_at' => now()->addDays(7),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/invitations");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('does not list expired invitations', function () {
    WorkspaceInvitation::create([
        'workspace_id' => $this->workspace->id,
        'email' => 'expired@example.com',
        'token' => Str::uuid()->toString(),
        'invited_by' => $this->user->name,
        'expires_at' => now()->subDay(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/invitations");

    $response->assertStatus(200)
        ->assertJsonCount(0, 'data');
});

it('revokes an invitation', function () {
    $invitation = WorkspaceInvitation::create([
        'workspace_id' => $this->workspace->id,
        'email' => 'revoke@example.com',
        'token' => Str::uuid()->toString(),
        'invited_by' => $this->user->name,
        'expires_at' => now()->addDays(7),
    ]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/invitations/{$invitation->token}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.revoked', true);

    $this->assertDatabaseMissing('workspace_invitations', ['id' => $invitation->id]);
});

it('returns 404 when revoking a non-existent invitation', function () {
    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/invitations/".Str::uuid(),
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(404);
});

it('accepts an invitation for an existing user and joins the workspace', function () {
    $invitation = WorkspaceInvitation::create([
        'workspace_id' => $this->workspace->id,
        'email' => 'accept@example.com',
        'role' => 'member',
        'token' => Str::uuid()->toString(),
        'invited_by' => $this->user->name,
        'expires_at' => now()->addDays(7),
    ]);
    User::factory()->create(['email' => 'accept@example.com']);

    $response = $this->getJson("/api/invitations/{$invitation->token}/accept");

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'joined')
        ->assertJsonPath('data.workspace_id', $this->workspace->id);

    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $this->workspace->id,
        'user_id' => User::where('email', 'accept@example.com')->first()->id,
    ]);
});

it('returns register_required when accepting invitation without an existing account', function () {
    $invitation = WorkspaceInvitation::create([
        'workspace_id' => $this->workspace->id,
        'email' => 'newuser@example.com',
        'role' => 'member',
        'token' => Str::uuid()->toString(),
        'invited_by' => $this->user->name,
        'expires_at' => now()->addDays(7),
    ]);

    $response = $this->getJson("/api/invitations/{$invitation->token}/accept");

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'register_required')
        ->assertJsonPath('data.email', 'newuser@example.com');
});

it('returns 404 for expired invitation on accept', function () {
    $invitation = WorkspaceInvitation::create([
        'workspace_id' => $this->workspace->id,
        'email' => 'expired@example.com',
        'token' => Str::uuid()->toString(),
        'invited_by' => $this->user->name,
        'expires_at' => now()->subDay(),
    ]);

    $response = $this->getJson("/api/invitations/{$invitation->token}/accept");

    $response->assertStatus(404);
});

it('returns 404 for already accepted invitation', function () {
    $invitation = WorkspaceInvitation::create([
        'workspace_id' => $this->workspace->id,
        'email' => 'already@example.com',
        'token' => Str::uuid()->toString(),
        'invited_by' => $this->user->name,
        'accepted_at' => now(),
        'expires_at' => now()->addDays(7),
    ]);

    $response = $this->getJson("/api/invitations/{$invitation->token}/accept");

    $response->assertStatus(404);
});

it('rejects duplicate invitation for existing member', function () {
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => User::factory()->create(['email' => 'member@example.com'])->id,
        'role' => 'member',
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/invitations",
        ['email' => 'member@example.com', 'role' => 'member'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(409);
});
