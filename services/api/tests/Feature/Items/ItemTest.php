<?php

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use App\Models\Board;
use App\Models\BoardGroup;
use App\Models\Item;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user      = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id'      => $this->user->id,
        'role'         => 'owner',
    ]);
    $this->board = Board::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
    ]);
    $this->group = BoardGroup::factory()->create([
        'board_id'     => $this->board->id,
        'workspace_id' => $this->workspace->id,
    ]);
    Sanctum::actingAs($this->user);
});

it('creates an item in a board group', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items",
        [
            'title'    => 'New Task',
            'group_id' => $this->group->id,
        ],
        ['Idempotency-Key' => \Illuminate\Support\Str::uuid()->toString()]
    );

    $response->assertStatus(201)
             ->assertJsonPath('data.title', 'New Task');

    $this->assertDatabaseHas('items', [
        'board_id' => $this->board->id,
        'title'    => 'New Task',
    ]);
});

it('lists items in a board', function () {
    Item::factory()->count(3)->create([
        'board_id'     => $this->board->id,
        'group_id'     => $this->group->id,
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items"
    );

    $response->assertStatus(200);
    $this->assertGreaterThanOrEqual(3, count($response->json('data')));
});

it('shows a specific item', function () {
    $item = Item::factory()->create([
        'board_id'     => $this->board->id,
        'group_id'     => $this->group->id,
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
        'title'        => 'Show Me',
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$item->id}"
    );

    $response->assertStatus(200)
             ->assertJsonPath('data.title', 'Show Me');
});

it('updates an item title', function () {
    $item = Item::factory()->create([
        'board_id'     => $this->board->id,
        'group_id'     => $this->group->id,
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
        'title'        => 'Original Title',
        'version'      => 1,
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$item->id}",
        [
            'title'            => 'Updated Title',
            'expected_version' => 1,
        ],
        ['Idempotency-Key' => \Illuminate\Support\Str::uuid()->toString()]
    );

    $response->assertStatus(200)
             ->assertJsonPath('data.title', 'Updated Title');
});

it('returns 409 on concurrent edit conflict (stale version)', function () {
    $item = Item::factory()->create([
        'board_id'     => $this->board->id,
        'group_id'     => $this->group->id,
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
        'version'      => 5,
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$item->id}",
        [
            'title'            => 'Conflicting Update',
            'expected_version' => 1, // stale version — server has version 5
        ],
        ['Idempotency-Key' => \Illuminate\Support\Str::uuid()->toString()]
    );

    $response->assertStatus(409);
    expect($response->json('error.code'))->toBe('CONCURRENT_EDIT');
});

it('deletes an item (soft delete)', function () {
    $item = Item::factory()->create([
        'board_id'     => $this->board->id,
        'group_id'     => $this->group->id,
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
    ]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$item->id}",
        [],
        ['Idempotency-Key' => \Illuminate\Support\Str::uuid()->toString()]
    );

    $response->assertStatus(204);
    $this->assertSoftDeleted('items', ['id' => $item->id]);
});

it('filters items by status', function () {
    Item::factory()->create([
        'board_id'     => $this->board->id,
        'group_id'     => $this->group->id,
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
        'status'       => 'done',
    ]);
    Item::factory()->create([
        'board_id'     => $this->board->id,
        'group_id'     => $this->group->id,
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
        'status'       => 'in_progress',
    ]);

    $response = $this->getJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items?status=done"
    );

    $response->assertStatus(200);
    foreach ($response->json('data') as $item) {
        expect($item['status'])->toBe('done');
    }
});

it('duplicates an item', function () {
    $item = Item::factory()->create([
        'board_id'     => $this->board->id,
        'group_id'     => $this->group->id,
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
        'title'        => 'Original',
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/items/{$item->id}/duplicate",
        [],
        ['Idempotency-Key' => \Illuminate\Support\Str::uuid()->toString()]
    );

    $response->assertStatus(201);
    expect($response->json('data.title'))->toContain('Copy');
});
