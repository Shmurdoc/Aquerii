<?php

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use App\Models\Board;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user      = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id'      => $this->user->id,
        'role'         => 'owner',
    ]);
    Sanctum::actingAs($this->user);
});

it('creates a board with default columns and group', function () {
    $response = $this->postJson("/api/workspaces/{$this->workspace->id}/boards", [
        'name' => 'My Test Board',
    ], ['Idempotency-Key' => \Illuminate\Support\Str::uuid()->toString()]);

    $response->assertStatus(201)
             ->assertJsonPath('data.name', 'My Test Board');

    $this->assertDatabaseHas('boards', [
        'workspace_id' => $this->workspace->id,
        'name'         => 'My Test Board',
    ]);

    // Default group and columns created
    $board = Board::where('name', 'My Test Board')->first();
    $this->assertNotNull($board);
    $this->assertDatabaseHas('board_groups', ['board_id' => $board->id]);
    $this->assertDatabaseHas('board_columns', ['board_id' => $board->id]);
});

it('lists boards for workspace', function () {
    Board::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/boards");

    $response->assertStatus(200)
             ->assertJsonCount(3, 'data');
});

it('shows a specific board with columns and groups', function () {
    $board = Board::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/boards/{$board->id}");

    $response->assertStatus(200)
             ->assertJsonPath('data.id', $board->id);
});

it('updates a board name', function () {
    $board = Board::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$board->id}",
        ['name' => 'Renamed Board'],
        ['Idempotency-Key' => \Illuminate\Support\Str::uuid()->toString()]
    );

    $response->assertStatus(200)
             ->assertJsonPath('data.name', 'Renamed Board');
});

it('deletes a board', function () {
    $board = Board::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by'   => $this->user->id,
    ]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$board->id}",
        [],
        ['Idempotency-Key' => \Illuminate\Support\Str::uuid()->toString()]
    );

    $response->assertStatus(204);
    $this->assertSoftDeleted('boards', ['id' => $board->id]);
});

it('returns 404 for a board in a different workspace', function () {
    $otherWorkspace = Workspace::factory()->create();
    $board = Board::factory()->create([
        'workspace_id' => $otherWorkspace->id,
        'created_by'   => $this->user->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/boards/{$board->id}");

    $response->assertStatus(404);
});
