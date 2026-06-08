<?php

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
});

it('creates a document folder', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/document-folders",
        ['name' => 'Projects'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);

    $this->assertDatabaseHas('document_folders', [
        'workspace_id' => $this->workspace->id,
        'name' => 'Projects',
    ]);
});

it('creates a nested document folder', function () {
    $parentId = Str::uuid()->toString();
    DB::table('document_folders')->insert([
        'id' => $parentId,
        'workspace_id' => $this->workspace->id,
        'name' => 'Parent',
        'position' => 1,
        'created_by' => $this->user->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/document-folders",
        [
            'name' => 'Child',
            'parent_id' => $parentId,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);

    $this->assertDatabaseHas('document_folders', [
        'workspace_id' => $this->workspace->id,
        'name' => 'Child',
        'parent_id' => $parentId,
    ]);
});

it('lists document folders', function () {
    DB::table('document_folders')->insert([
        ['id' => Str::uuid()->toString(), 'workspace_id' => $this->workspace->id, 'name' => 'Folder A', 'position' => 1, 'created_by' => $this->user->id, 'created_at' => now(), 'updated_at' => now()],
        ['id' => Str::uuid()->toString(), 'workspace_id' => $this->workspace->id, 'name' => 'Folder B', 'position' => 2, 'created_by' => $this->user->id, 'created_at' => now(), 'updated_at' => now()],
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/document-folders");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('updates a folder name', function () {
    $folderId = Str::uuid()->toString();
    DB::table('document_folders')->insert([
        'id' => $folderId,
        'workspace_id' => $this->workspace->id,
        'name' => 'Old Name',
        'position' => 1,
        'created_by' => $this->user->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/document-folders/{$folderId}",
        ['name' => 'Updated Name'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.updated', true);

    $this->assertDatabaseHas('document_folders', [
        'id' => $folderId,
        'name' => 'Updated Name',
    ]);
});

it('re-parents a folder', function () {
    $folderId = Str::uuid()->toString();
    $newParentId = Str::uuid()->toString();
    DB::table('document_folders')->insert([
        ['id' => $folderId, 'workspace_id' => $this->workspace->id, 'name' => 'Movable', 'position' => 1, 'created_by' => $this->user->id, 'created_at' => now(), 'updated_at' => now()],
        ['id' => $newParentId, 'workspace_id' => $this->workspace->id, 'name' => 'New Parent', 'position' => 2, 'created_by' => $this->user->id, 'created_at' => now(), 'updated_at' => now()],
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/document-folders/{$folderId}",
        ['parent_id' => $newParentId],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);

    $this->assertDatabaseHas('document_folders', [
        'id' => $folderId,
        'parent_id' => $newParentId,
    ]);
});

it('deletes a folder (soft delete)', function () {
    $folderId = Str::uuid()->toString();
    DB::table('document_folders')->insert([
        'id' => $folderId,
        'workspace_id' => $this->workspace->id,
        'name' => 'Delete Me',
        'position' => 1,
        'created_by' => $this->user->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/document-folders/{$folderId}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.deleted', true);
});

it('retrieves folder tree structure', function () {
    $parentId = Str::uuid()->toString();
    $childId = Str::uuid()->toString();
    DB::table('document_folders')->insert([
        'id' => $parentId,
        'workspace_id' => $this->workspace->id,
        'name' => 'Root',
        'position' => 1,
        'created_by' => $this->user->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('document_folders')->insert([
        'id' => $childId,
        'workspace_id' => $this->workspace->id,
        'name' => 'Child',
        'parent_id' => $parentId,
        'position' => 1,
        'created_by' => $this->user->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/document-folders");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');

    $names = collect($response->json('data'))->pluck('name');
    expect($names)->toContain('Root', 'Child');
});

it('returns 404 when updating a non-existent folder', function () {
    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/document-folders/".Str::uuid(),
        ['name' => 'Ghost'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(404);
});

it('returns 404 when deleting a non-existent folder', function () {
    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/document-folders/".Str::uuid(),
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(404);
});
