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

it('creates a board group', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/groups",
        ['name' => 'In Progress', 'color' => '#22c55e'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);

    $this->assertDatabaseHas('board_groups', [
        'board_id' => $this->board->id,
        'name' => 'In Progress',
    ]);
});

it('lists board groups', function () {
    DB::table('board_groups')->insert([
        ['id' => Str::uuid()->toString(), 'board_id' => $this->board->id, 'workspace_id' => $this->workspace->id, 'name' => 'To Do', 'color' => '#6366f1', 'position' => 0, 'created_at' => now(), 'updated_at' => now()],
        ['id' => Str::uuid()->toString(), 'board_id' => $this->board->id, 'workspace_id' => $this->workspace->id, 'name' => 'Done', 'color' => '#22c55e', 'position' => 1, 'created_at' => now(), 'updated_at' => now()],
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/groups");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('shows a specific group', function () {
    $groupId = Str::uuid()->toString();
    DB::table('board_groups')->insert([
        'id' => $groupId,
        'board_id' => $this->board->id,
        'workspace_id' => $this->workspace->id,
        'name' => 'Review',
        'color' => '#f59e0b',
        'position' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/groups/{$groupId}");

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Review');
});

it('updates a group name', function () {
    $groupId = Str::uuid()->toString();
    DB::table('board_groups')->insert([
        'id' => $groupId,
        'board_id' => $this->board->id,
        'workspace_id' => $this->workspace->id,
        'name' => 'Old Name',
        'color' => '#6366f1',
        'position' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/groups/{$groupId}",
        ['name' => 'Updated Name'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.updated', true);

    $this->assertDatabaseHas('board_groups', [
        'id' => $groupId,
        'name' => 'Updated Name',
    ]);
});

it('deletes a group', function () {
    $groupId = Str::uuid()->toString();
    DB::table('board_groups')->insert([
        'id' => $groupId,
        'board_id' => $this->board->id,
        'workspace_id' => $this->workspace->id,
        'name' => 'Delete Me',
        'color' => '#ef4444',
        'position' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/groups/{$groupId}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.deleted', true);

    $this->assertDatabaseMissing('board_groups', ['id' => $groupId]);
});

it('reorders groups by updating positions', function () {
    $groupA = Str::uuid()->toString();
    $groupB = Str::uuid()->toString();
    DB::table('board_groups')->insert([
        ['id' => $groupA, 'board_id' => $this->board->id, 'workspace_id' => $this->workspace->id, 'name' => 'First', 'color' => '#6366f1', 'position' => 0, 'created_at' => now(), 'updated_at' => now()],
        ['id' => $groupB, 'board_id' => $this->board->id, 'workspace_id' => $this->workspace->id, 'name' => 'Second', 'color' => '#22c55e', 'position' => 65536, 'created_at' => now(), 'updated_at' => now()],
    ]);

    $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/groups/{$groupA}",
        ['position' => 65536],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(200);

    $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/groups/{$groupB}",
        ['position' => 0],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(200);

    $groups = DB::table('board_groups')->where('board_id', $this->board->id)->orderBy('position')->get();
    expect($groups->first()->id)->toBe($groupB);
    expect($groups->last()->id)->toBe($groupA);
});

it('returns 404 for group in a different board', function () {
    $otherBoard = Board::factory()->create(['workspace_id' => $this->workspace->id]);
    $groupId = Str::uuid()->toString();
    DB::table('board_groups')->insert([
        'id' => $groupId,
        'board_id' => $otherBoard->id,
        'workspace_id' => $this->workspace->id,
        'name' => 'Hidden',
        'color' => '#6366f1',
        'position' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/boards/{$this->board->id}/groups/{$groupId}");

    $response->assertStatus(404);
});
