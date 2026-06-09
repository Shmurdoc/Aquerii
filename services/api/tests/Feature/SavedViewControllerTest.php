<?php

use App\Core\Models\SavedView;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->owner->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($this->owner);
});

// ─── index ───────────────────────────────────────────────────────────────────

it('returns own views plus shared views from other workspace members', function () {
    // Caller's own private view → visible.
    $own = SavedView::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'name' => 'My deals',
        'entity_type' => 'deals',
        'filters' => [['column' => 'stage', 'op' => 'eq', 'value' => 'won']],
        'is_shared' => false,
    ]);

    // Another member's *shared* view → visible.
    $teammate = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $teammate->id,
        'role' => 'member',
    ]);
    $teammateShared = SavedView::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $teammate->id,
        'name' => 'Team pipeline',
        'entity_type' => 'deals',
        'filters' => [],
        'is_shared' => true,
    ]);

    // Another member's *private* view → invisible.
    $teammatePrivate = SavedView::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $teammate->id,
        'name' => 'Their secret view',
        'entity_type' => 'deals',
        'filters' => [],
        'is_shared' => false,
    ]);

    // Wrong entity_type → filtered out even though owned.
    SavedView::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'name' => 'Contacts view',
        'entity_type' => 'contacts',
        'filters' => [],
        'is_shared' => false,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/saved-views?entity_type=deals");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');

    $ids = collect($response->json('data'))->pluck('id')->all();
    expect($ids)->toContain($own->id, $teammateShared->id);
    expect($ids)->not->toContain($teammatePrivate->id);
});

// ─── store ───────────────────────────────────────────────────────────────────

it('creates a saved view owned by the calling user', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/saved-views",
        [
            'name' => 'High-value deals',
            'entity_type' => 'deals',
            'filters' => [
                ['column' => 'amount', 'operator' => 'gte', 'value' => 10000],
            ],
            'sort' => [['column' => 'amount', 'direction' => 'desc']],
            'columns' => ['name', 'amount', 'stage'],
            'is_shared' => false,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'High-value deals')
        ->assertJsonPath('data.entity_type', 'deals')
        ->assertJsonPath('data.user_id', $this->owner->id)
        ->assertJsonPath('data.workspace_id', $this->workspace->id)
        ->assertJsonPath('data.is_shared', false);

    $this->assertDatabaseHas('saved_views', [
        'id' => $response->json('data.id'),
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'name' => 'High-value deals',
        'entity_type' => 'deals',
    ]);
});

// ─── update ──────────────────────────────────────────────────────────────────

it('lets the owner update but blocks non-owners on a private view', function () {
    $view = SavedView::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'name' => 'Original',
        'entity_type' => 'deals',
        'filters' => [],
        'is_shared' => false,
    ]);

    // Owner update → 200.
    $ownerResponse = $this->putJson(
        "/api/workspaces/{$this->workspace->id}/saved-views/{$view->id}",
        ['name' => 'Renamed by owner'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $ownerResponse->assertStatus(200)
        ->assertJsonPath('data.name', 'Renamed by owner');

    // Switch to a different member with no edit rights on a private view.
    $other = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $other->id,
        'role' => 'member',
    ]);
    Sanctum::actingAs($other);

    $otherResponse = $this->putJson(
        "/api/workspaces/{$this->workspace->id}/saved-views/{$view->id}",
        ['name' => 'Hijacked'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $otherResponse->assertStatus(403);

    // DB still reflects the owner's change, not the hijack attempt.
    expect($view->fresh()->name)->toBe('Renamed by owner');
});

// ─── destroy ─────────────────────────────────────────────────────────────────

it('lets the owner delete but blocks non-owners even on a shared view', function () {
    $view = SavedView::create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'name' => 'Shared but owner-only-delete',
        'entity_type' => 'deals',
        'filters' => [],
        'is_shared' => true,
    ]);

    // Non-owner cannot delete even though the view is shared.
    $other = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $other->id,
        'role' => 'member',
    ]);
    Sanctum::actingAs($other);

    $blocked = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/saved-views/{$view->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    $blocked->assertStatus(403);
    $this->assertDatabaseHas('saved_views', ['id' => $view->id]);

    // Owner can delete.
    Sanctum::actingAs($this->owner);
    $ok = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/saved-views/{$view->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );
    expect(in_array($ok->status(), [200, 204], true))->toBeTrue();
    $this->assertDatabaseMissing('saved_views', ['id' => $view->id]);
});
