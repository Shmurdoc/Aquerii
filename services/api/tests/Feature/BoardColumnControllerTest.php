<?php

use App\Core\Models\Board;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($this->user);

    $this->board = Board::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->user->id,
    ]);
});

it('creates a board column', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/columns",
        ['title' => 'Status', 'type' => 'select'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);

    $this->assertDatabaseHas('columns', [
        'board_id' => $this->board->id,
        'title' => 'Status',
        'type' => 'select',
    ]);
});

it('lists board columns', function () {
    DB::table('columns')->insert([
        ['id' => Str::uuid()->toString(), 'board_id' => $this->board->id, 'title' => 'Text', 'type' => 'text', 'position' => 0, 'created_at' => now(), 'updated_at' => now()],
        ['id' => Str::uuid()->toString(), 'board_id' => $this->board->id, 'title' => 'Number', 'type' => 'number', 'position' => 65536, 'created_at' => now(), 'updated_at' => now()],
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/columns");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('shows a specific column', function () {
    $columnId = Str::uuid()->toString();
    DB::table('columns')->insert([
        'id' => $columnId,
        'board_id' => $this->board->id,
        'title' => 'Assignee',
        'type' => 'people',
        'position' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/columns/{$columnId}");

    $response->assertStatus(200)
        ->assertJsonPath('data.title', 'Assignee');
});

it('updates a column title', function () {
    $columnId = Str::uuid()->toString();
    DB::table('columns')->insert([
        'id' => $columnId,
        'board_id' => $this->board->id,
        'title' => 'Old Title',
        'type' => 'text',
        'position' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/columns/{$columnId}",
        ['title' => 'Updated Title'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.updated', true);

    $this->assertDatabaseHas('columns', [
        'id' => $columnId,
        'title' => 'Updated Title',
    ]);
});

it('deletes a column', function () {
    $columnId = Str::uuid()->toString();
    DB::table('columns')->insert([
        'id' => $columnId,
        'board_id' => $this->board->id,
        'title' => 'Delete Me',
        'type' => 'text',
        'position' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/columns/{$columnId}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.deleted', true);

    $this->assertDatabaseMissing('columns', ['id' => $columnId]);
});

it('reorders columns by updating positions', function () {
    $colA = Str::uuid()->toString();
    $colB = Str::uuid()->toString();
    DB::table('columns')->insert([
        ['id' => $colA, 'board_id' => $this->board->id, 'title' => 'First', 'type' => 'text', 'position' => 0, 'created_at' => now(), 'updated_at' => now()],
        ['id' => $colB, 'board_id' => $this->board->id, 'title' => 'Second', 'type' => 'number', 'position' => 65536, 'created_at' => now(), 'updated_at' => now()],
    ]);

    $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/columns/{$colA}",
        ['position' => 65536],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(200);

    $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/columns/{$colB}",
        ['position' => 0],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(200);

    $columns = DB::table('columns')->where('board_id', $this->board->id)->orderBy('position')->get();
    expect($columns->first()->id)->toBe($colB);
    expect($columns->last()->id)->toBe($colA);
});

it('validates column type is required on create', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/columns",
        ['title' => 'Bad Column'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422);
});
