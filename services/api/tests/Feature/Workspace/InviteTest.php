<?php

use App\Core\Mail\WorkspaceInvitation;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Mail::fake();
    $this->owner = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->owner->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($this->owner);
});

it('sends an invitation email when inviting a new member', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/members",
        ['email' => 'newuser@example.com', 'role' => 'member'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);
    Mail::assertQueued(WorkspaceInvitation::class, function ($mail) {
        return $mail->hasTo('newuser@example.com');
    });
});

it('creates a pending workspace_member row with invite_token on invite', function () {
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/members",
        ['email' => 'pending@example.com', 'role' => 'member'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(201);

    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $this->workspace->id,
        'invited_email' => 'pending@example.com',
        'status' => 'pending',
    ]);
});

it('accepts a valid invite token and links to the correct user', function () {
    // Create a pending invite
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/members",
        ['email' => 'acceptme@example.com', 'role' => 'member'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(201);

    $invite = WorkspaceMember::where('invited_email', 'acceptme@example.com')->firstOrFail();
    $user = User::factory()->create(['email' => 'acceptme@example.com']);

    Sanctum::actingAs($user);

    $response = $this->postJson(
        "/api/invites/{$invite->invite_token}/accept",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);
    $this->assertDatabaseHas('workspace_members', [
        'id' => $invite->id,
        'user_id' => $user->id,
        'status' => 'active',
    ]);
});

it('rejects an expired invite token', function () {
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/members",
        ['email' => 'expired@example.com', 'role' => 'member'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(201);

    $invite = WorkspaceMember::where('invited_email', 'expired@example.com')->firstOrFail();

    // Manually expire the invite by backdating created_at beyond 7 days
    DB::table('workspace_members')
        ->where('id', $invite->id)
        ->update(['created_at' => now()->subDays(8)]);

    $user = User::factory()->create(['email' => 'expired@example.com']);
    Sanctum::actingAs($user);

    $this->postJson(
        "/api/invites/{$invite->invite_token}/accept",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(410);
});

it('rejects an invite token used by the wrong email', function () {
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/members",
        ['email' => 'rightperson@example.com', 'role' => 'member'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(201);

    $invite = WorkspaceMember::where('invited_email', 'rightperson@example.com')->firstOrFail();
    $wrongUser = User::factory()->create(['email' => 'wrongperson@example.com']);
    Sanctum::actingAs($wrongUser);

    $this->postJson(
        "/api/invites/{$invite->invite_token}/accept",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(403);
});
