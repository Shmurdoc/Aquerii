<?php

use App\Core\Models\User;
use App\Core\Models\WebhookDelivery;
use App\Core\Models\WebhookEndpoint;
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

it('lists webhook endpoints for the owner', function () {
    WebhookEndpoint::factory()->count(2)->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/webhook-endpoints");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('does not leak the secret in index responses', function () {
    WebhookEndpoint::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/webhook-endpoints");

    $response->assertStatus(200);
    expect($response->json('data.0'))->not->toHaveKey('secret');
});

it('blocks admins from listing webhook endpoints with 403', function () {
    $admin = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);
    Sanctum::actingAs($admin);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/webhook-endpoints");

    $response->assertStatus(403);
});

it('blocks members from listing webhook endpoints with 403', function () {
    $member = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    Sanctum::actingAs($member);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/webhook-endpoints");

    $response->assertStatus(403);
});

// ─── store ───────────────────────────────────────────────────────────────────

it('creates a webhook endpoint and returns the secret once', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/webhook-endpoints",
        [
            'name' => 'My Webhook',
            'url' => 'https://example.com/hook',
            'events' => ['deal.won', 'contact.created'],
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'My Webhook')
        ->assertJsonPath('data.url', 'https://example.com/hook');

    // Secret is revealed exactly once on creation.
    $secret = $response->json('data.secret');
    expect($secret)->toBeString()->not->toBeEmpty();
    // 32 bytes base64-encoded = 44 chars (including padding).
    expect(strlen($secret))->toBeGreaterThanOrEqual(40);
});

it('rejects http URLs in store', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/webhook-endpoints",
        [
            'name' => 'Insecure',
            'url' => 'http://example.com/hook',
            'events' => ['deal.won'],
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['url']);
});

it('rejects empty events array in store', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/webhook-endpoints",
        [
            'name' => 'NoEvents',
            'url' => 'https://example.com/hook',
            'events' => [],
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['events']);
});

it('blocks admins from creating webhook endpoints with 403', function () {
    $admin = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);
    Sanctum::actingAs($admin);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/webhook-endpoints",
        [
            'name' => 'Should Fail',
            'url' => 'https://example.com/hook',
            'events' => ['deal.won'],
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(403);
});

it('generates each new secret using random_bytes, not Str::random', function () {
    // Two distinct create calls should produce distinct, sufficiently-long
    // base64 secrets — this is the strongest guarantee we can give in a unit
    // test without inspecting the source.
    $a = WebhookEndpoint::generateSecret();
    $b = WebhookEndpoint::generateSecret();

    expect($a)->not->toBe($b);
    expect(base64_decode($a, true))->toBeString();
    expect(strlen(base64_decode($a, true)))->toBe(32);
});

// ─── show ────────────────────────────────────────────────────────────────────

it('shows a webhook endpoint', function () {
    $endpoint = WebhookEndpoint::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
        'name' => 'Shown',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/webhook-endpoints/{$endpoint->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Shown');
});

it('returns 404 for an endpoint belonging to another workspace', function () {
    $other = Workspace::factory()->create();
    $endpoint = WebhookEndpoint::factory()->create([
        'workspace_id' => $other->id,
        'created_by' => $this->owner->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/webhook-endpoints/{$endpoint->id}");

    $response->assertStatus(404);
});

// ─── update ──────────────────────────────────────────────────────────────────

it('updates a webhook endpoint', function () {
    $endpoint = WebhookEndpoint::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
        'name' => 'Original',
    ]);

    $response = $this->putJson(
        "/api/workspaces/{$this->workspace->id}/webhook-endpoints/{$endpoint->id}",
        [
            'name' => 'Renamed',
            'is_active' => false,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Renamed')
        ->assertJsonPath('data.is_active', false);
});

it('rejects http URLs in update', function () {
    $endpoint = WebhookEndpoint::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
    ]);

    $response = $this->putJson(
        "/api/workspaces/{$this->workspace->id}/webhook-endpoints/{$endpoint->id}",
        ['url' => 'http://example.com/hook'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['url']);
});

it('blocks admins from updating webhook endpoints with 403', function () {
    $endpoint = WebhookEndpoint::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
    ]);
    $admin = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);
    Sanctum::actingAs($admin);

    $response = $this->putJson(
        "/api/workspaces/{$this->workspace->id}/webhook-endpoints/{$endpoint->id}",
        ['name' => 'Hijacked'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(403);
});

// ─── destroy ─────────────────────────────────────────────────────────────────

it('soft-deletes a webhook endpoint', function () {
    $endpoint = WebhookEndpoint::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
    ]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/webhook-endpoints/{$endpoint->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    expect(in_array($response->status(), [200, 204], true))->toBeTrue();
    // Soft delete — row is still present but `deleted_at` is set.
    $row = WebhookEndpoint::withTrashed()->find($endpoint->id);
    expect($row)->not->toBeNull();
    expect($row->trashed())->toBeTrue();
});

it('blocks admins from deleting webhook endpoints with 403', function () {
    $endpoint = WebhookEndpoint::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
    ]);
    $admin = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);
    Sanctum::actingAs($admin);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/webhook-endpoints/{$endpoint->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(403);
});

// ─── rotateSecret ────────────────────────────────────────────────────────────

it('rotates the signing secret', function () {
    $endpoint = WebhookEndpoint::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
    ]);
    $originalSecret = $endpoint->secret;

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/webhook-endpoints/{$endpoint->id}/rotate-secret",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.id', $endpoint->id);

    $newSecret = $response->json('data.secret');
    expect($newSecret)->toBeString()->not->toBe($originalSecret);

    // The DB row's secret should have changed.
    $endpoint->refresh();
    expect($endpoint->secret)->toBe($newSecret);
});

it('blocks admins from rotating webhook secrets with 403', function () {
    $endpoint = WebhookEndpoint::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
    ]);
    $admin = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);
    Sanctum::actingAs($admin);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/webhook-endpoints/{$endpoint->id}/rotate-secret",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(403);
});

// ─── deliveries ──────────────────────────────────────────────────────────────

it('lists recent deliveries for an endpoint', function () {
    $endpoint = WebhookEndpoint::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
    ]);
    WebhookDelivery::factory()->count(3)->create([
        'webhook_endpoint_id' => $endpoint->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/webhook-endpoints/{$endpoint->id}/deliveries");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('blocks admins from viewing deliveries with 403', function () {
    $endpoint = WebhookEndpoint::factory()->create([
        'workspace_id' => $this->workspace->id,
        'created_by' => $this->owner->id,
    ]);
    $admin = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);
    Sanctum::actingAs($admin);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/webhook-endpoints/{$endpoint->id}/deliveries");

    $response->assertStatus(403);
});
