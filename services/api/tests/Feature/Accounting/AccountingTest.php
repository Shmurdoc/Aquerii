<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Accounting\Models\Account;
use App\Modules\Accounting\Models\JournalEntry;
use Illuminate\Support\Facades\Gate;
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

    $this->assetAccount = Account::factory()->create([
        'workspace_id' => $this->workspace->id,
        'type' => 'asset',
        'code' => '1000',
    ]);
    $this->revenueAccount = Account::factory()->create([
        'workspace_id' => $this->workspace->id,
        'type' => 'income',
        'code' => '4000',
    ]);
});

it('creates a journal entry', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/journal-entries",
        [
            'entries' => [
                ['account_id' => $this->assetAccount->id, 'description' => 'Cash received', 'debit_amount' => 1000, 'credit_amount' => 0],
                ['account_id' => $this->revenueAccount->id, 'description' => 'Revenue earned', 'debit_amount' => 0, 'credit_amount' => 1000],
            ],
            'entry_date' => '2026-01-01',
        ]
    );
    $response->assertStatus(201)
        ->assertJsonPath('data.0.description', 'Cash received');
});

it('rejects unbalanced journal entries', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/journal-entries",
        [
            'entries' => [
                ['account_id' => $this->assetAccount->id, 'description' => 'Cash received', 'debit_amount' => 1000, 'credit_amount' => 0],
                ['account_id' => $this->revenueAccount->id, 'description' => 'Revenue earned', 'debit_amount' => 0, 'credit_amount' => 500],
            ],
            'entry_date' => '2026-01-01',
        ]
    );
    $response->assertStatus(422);
});

it('lists journal entries', function () {
    JournalEntry::factory()->count(3)->create(['workspace_id' => $this->workspace->id]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/journal-entries");
    $response->assertStatus(200)
        ->assertJsonCount(3, 'data.data');
});

it('updates a journal entry', function () {
    $entry = JournalEntry::factory()->create(['workspace_id' => $this->workspace->id]);
    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/journal-entries/{$entry->id}",
        ['description' => 'Updated description']
    );
    $response->assertStatus(200)
        ->assertJsonPath('data.description', 'Updated description');
});

it('deletes a journal entry', function () {
    $entry = JournalEntry::factory()->create(['workspace_id' => $this->workspace->id]);
    $response = $this->deleteJson("/api/workspaces/{$this->workspace->id}/journal-entries/{$entry->id}");
    $response->assertStatus(200);
    $this->assertDatabaseMissing('journal_entries', ['id' => $entry->id]);
});

it('returns trial balance', function () {
    JournalEntry::factory()->create([
        'workspace_id' => $this->workspace->id,
        'account_id' => $this->assetAccount->id,
        'debit_amount' => 500,
        'credit_amount' => 0,
    ]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/reports/trial-balance");
    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

it('returns profit and loss report', function () {
    JournalEntry::factory()->create([
        'workspace_id' => $this->workspace->id,
        'account_id' => $this->revenueAccount->id,
        'debit_amount' => 0,
        'credit_amount' => 1000,
    ]);
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/reports/profit-loss");
    $response->assertStatus(200)
        ->assertJsonPath('data.revenue', 1000);
});

it('returns balance sheet', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/reports/balance-sheet");
    $response->assertStatus(200)
        ->assertJsonPath('data.assets', 0);
});

it('returns cash flow report', function () {
    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/reports/cash-flow");
    $response->assertStatus(200)
        ->assertJsonPath('data.operating', 0);
});

it('creates and lists accounts', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/accounts",
        ['code' => '2000', 'name' => 'Accounts Payable', 'type' => 'liability']
    );
    $response->assertStatus(201);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/accounts");
    $response->assertStatus(200);
});
