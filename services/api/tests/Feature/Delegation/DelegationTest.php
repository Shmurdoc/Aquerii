<?php

// Delegation module is killed per scope.md — these tests are skipped in Phase 1
if (true) {
    return;
}

use App\Core\Models\Board;
use App\Core\Models\BoardGroup;
use App\Core\Models\Item;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Delegation\Models\Delegation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->recipient = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->recipient->id,
        'role' => 'member',
    ]);
    Sanctum::actingAs($this->user);

    Gate::define('create', fn ($user, $model, $workspace) => true);
    Gate::define('view', fn ($user, $model) => true);
    Gate::define('update', fn ($user, $model) => true);
    Gate::define('delete', fn ($user, $model) => true);

    $this->board = Board::factory()->create(['workspace_id' => $this->workspace->id]);
    $this->group = BoardGroup::factory()->create(['board_id' => $this->board->id]);
    $this->item = Item::factory()->create([
        'workspace_id' => $this->workspace->id,
        'board_id' => $this->board->id,
        'group_id' => $this->group->id,
        'created_by' => $this->user->id,
    ]);
});

it('delegates a task to another user', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$this->item->id}/delegate",
        ['to_user_id' => $this->recipient->id, 'reason' => 'Need coverage while on leave'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(201)
        ->assertJsonPath('data.reason', 'Need coverage while on leave')
        ->assertJsonPath('data.status', 'active');
});

it('transfers item ownership on delegate', function () {
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$this->item->id}/delegate",
        ['to_user_id' => $this->recipient->id, 'reason' => 'Take over'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $this->assertDatabaseHas('items', ['id' => $this->item->id, 'created_by' => $this->recipient->id]);
});

it('revokes a delegation', function () {
    Delegation::factory()->create([
        'workspace_id' => $this->workspace->id,
        'item_id' => $this->item->id,
        'from_user_id' => $this->user->id,
        'to_user_id' => $this->recipient->id,
        'status' => 'active',
    ]);
    $this->item->update(['created_by' => $this->recipient->id]);

    $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$this->item->id}/delegate");
    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'revoked');
});

it('restores item ownership on revoke', function () {
    Delegation::factory()->create([
        'workspace_id' => $this->workspace->id,
        'item_id' => $this->item->id,
        'from_user_id' => $this->user->id,
        'to_user_id' => $this->recipient->id,
        'status' => 'active',
    ]);
    $this->item->update(['created_by' => $this->recipient->id]);

    $this->deleteJson("/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$this->item->id}/delegate");
    $this->assertDatabaseHas('items', ['id' => $this->item->id, 'created_by' => $this->user->id]);
});

it('lists delegations', function () {
    Delegation::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'from_user_id' => $this->user->id,
        'to_user_id' => $this->recipient->id,
    ]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/delegations");
    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('filters delegations by direction', function () {
    Delegation::factory()->create([
        'workspace_id' => $this->workspace->id,
        'from_user_id' => $this->user->id,
        'to_user_id' => $this->recipient->id,
    ]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/delegations?direction=sent");
    $response->assertStatus(200)
        ->assertJsonCount(1, 'data');
});

it('accepts a delegation', function () {
    Sanctum::actingAs($this->recipient);
    Delegation::factory()->create([
        'workspace_id' => $this->workspace->id,
        'item_id' => $this->item->id,
        'from_user_id' => $this->user->id,
        'to_user_id' => $this->recipient->id,
        'status' => 'active',
    ]);
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$this->item->id}/delegate/accept",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(200)
        ->assertJsonPath('data.accepted_by', $this->recipient->id);
});

it('rejects self-delegation', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$this->item->id}/delegate",
        ['to_user_id' => $this->user->id, 'reason' => 'To myself'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(422);
});

it('rejects delegation by non-owner', function () {
    $other = User::factory()->create();
    WorkspaceMember::factory()->create(['workspace_id' => $this->workspace->id, 'user_id' => $other->id, 'role' => 'member']);
    Sanctum::actingAs($other);
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$this->item->id}/delegate",
        ['to_user_id' => $this->recipient->id, 'reason' => 'Taking over'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $response->assertStatus(403);
});
