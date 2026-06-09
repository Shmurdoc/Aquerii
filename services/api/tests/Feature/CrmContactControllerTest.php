<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\CRM\Models\CrmCompany;
use App\Modules\CRM\Models\CrmContact;
use Illuminate\Support\Facades\Gate;
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

    Gate::define('create', fn ($user, $model, $workspace) => true);
    Gate::define('view', fn ($user, $model) => true);
    Gate::define('update', fn ($user, $model) => true);
    Gate::define('delete', fn ($user, $model) => true);
});

it('creates a contact', function () {
    $company = CrmCompany::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/crm/contacts",
        [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'company_id' => $company->id,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.first_name', 'John');
});

it('lists contacts', function () {
    CrmContact::factory()->count(3)->create([
        'workspace_id' => $this->workspace->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/contacts");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

it('shows a contact', function () {
    $contact = CrmContact::factory()->create([
        'workspace_id' => $this->workspace->id,
        'first_name' => 'Jane',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/contacts/{$contact->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.first_name', 'Jane');
});

it('updates a contact', function () {
    $contact = CrmContact::factory()->create([
        'workspace_id' => $this->workspace->id,
        'first_name' => 'Old',
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/crm/contacts/{$contact->id}",
        ['first_name' => 'Updated'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.first_name', 'Updated');
});

it('deletes a contact', function () {
    $contact = CrmContact::factory()->create(['workspace_id' => $this->workspace->id]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/crm/contacts/{$contact->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    expect(in_array($response->status(), [200, 204]))->toBeTrue();
});

it('searches contacts by name', function () {
    CrmContact::factory()->create([
        'workspace_id' => $this->workspace->id,
        'first_name' => 'Alice',
        'last_name' => 'Smith',
    ]);
    CrmContact::factory()->create([
        'workspace_id' => $this->workspace->id,
        'first_name' => 'Bob',
        'last_name' => 'Jones',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/contacts?search=Alice");

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonFragment(['first_name' => 'Alice']);
});

it('searches contacts by email', function () {
    CrmContact::factory()->create([
        'workspace_id' => $this->workspace->id,
        'email' => 'unique@example.com',
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/contacts?search=unique");

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data');
});

it('returns 404 for contact in a different workspace', function () {
    $other = Workspace::factory()->create();
    $contact = CrmContact::factory()->create(['workspace_id' => $other->id]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/crm/contacts/{$contact->id}");

    $response->assertStatus(404);
});
