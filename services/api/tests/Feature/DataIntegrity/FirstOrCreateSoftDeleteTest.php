<?php

use App\Core\Models\Board;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\CRM\Models\CrmCompany;
use App\Modules\CRM\Models\CrmContact;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Models\CrmPipeline;
use App\Modules\CRM\Models\CrmPipelineStage;
use App\Modules\Documents\Models\Document;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
});

it('finds soft-deleted user via withTrashed()->firstOrCreate', function () {
    $attrs = ['email' => 'softdeleted@example.com'];
    $extra = ['name' => 'Original'];

    $original = User::create(array_merge($attrs, $extra));
    $original->delete();

    $found = User::withTrashed()->firstOrCreate($attrs, $extra);

    expect($found->id)->toBe($original->id);
    expect($found->trashed())->toBeTrue();
});

it('finds soft-deleted workspace member via withTrashed()->firstOrCreate', function () {
    $member = WorkspaceMember::where('workspace_id', $this->workspace->id)
        ->where('user_id', $this->user->id)
        ->first();
    $member->delete();

    $found = WorkspaceMember::withTrashed()->firstOrCreate([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
    ], ['role' => 'member']);

    expect($found->id)->toBe($member->id);
    expect($found->trashed())->toBeTrue();
});

it('finds soft-deleted board via withTrashed()->firstOrCreate', function () {
    $board = Board::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Deleted Board',
    ]);
    $board->delete();

    $found = Board::withTrashed()->firstOrCreate([
        'workspace_id' => $this->workspace->id,
        'name' => 'Deleted Board',
    ], ['created_by' => $this->user->id]);

    expect($found->id)->toBe($board->id);
    expect($found->trashed())->toBeTrue();
});

it('finds soft-deleted document via withTrashed()->firstOrCreate', function () {
    $doc = Document::create([
        'workspace_id' => $this->workspace->id,
        'title' => 'Deleted Doc',
        'created_by' => $this->user->id,
        'content' => ['type' => 'doc', 'content' => []],
    ]);
    $doc->delete();

    $found = Document::withTrashed()->firstOrCreate([
        'workspace_id' => $this->workspace->id,
        'title' => 'Deleted Doc',
    ], ['created_by' => $this->user->id, 'content' => ['type' => 'doc', 'content' => []]]);

    expect($found->id)->toBe($doc->id);
    expect($found->trashed())->toBeTrue();
});

it('finds soft-deleted crm company via withTrashed()->firstOrCreate', function () {
    $company = CrmCompany::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Deleted Company',
    ]);
    $company->delete();

    $found = CrmCompany::withTrashed()->firstOrCreate([
        'workspace_id' => $this->workspace->id,
        'name' => 'Deleted Company',
    ], ['domain' => 'deleted.example.com']);

    expect($found->id)->toBe($company->id);
    expect($found->trashed())->toBeTrue();
});

it('finds soft-deleted crm contact via withTrashed()->firstOrCreate', function () {
    $contact = CrmContact::create([
        'workspace_id' => $this->workspace->id,
        'first_name' => 'Soft',
        'last_name' => 'Deleted',
        'email' => 'soft.deleted@example.com',
    ]);
    $contact->delete();

    $found = CrmContact::withTrashed()->firstOrCreate([
        'workspace_id' => $this->workspace->id,
        'email' => 'soft.deleted@example.com',
    ], ['first_name' => 'Soft', 'last_name' => 'Deleted']);

    expect($found->id)->toBe($contact->id);
    expect($found->trashed())->toBeTrue();
});

it('finds soft-deleted crm deal via withTrashed()->firstOrCreate', function () {
    $pipeline = CrmPipeline::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Default Pipeline',
    ]);
    $stage = CrmPipelineStage::create([
        'workspace_id' => $this->workspace->id,
        'pipeline_id' => $pipeline->id,
        'name' => 'Open',
    ]);

    $deal = CrmDeal::create([
        'workspace_id' => $this->workspace->id,
        'title' => 'Deleted Deal',
        'value' => 1000,
        'currency' => 'USD',
        'probability' => 50,
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
    ]);
    $deal->delete();

    $found = CrmDeal::withTrashed()->firstOrCreate([
        'workspace_id' => $this->workspace->id,
        'title' => 'Deleted Deal',
    ], ['value' => 1000, 'currency' => 'USD', 'probability' => 50, 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    expect($found->id)->toBe($deal->id);
    expect($found->trashed())->toBeTrue();
});

it('creates new record when no soft-deleted match exists', function () {
    $count = User::count();
    $user = User::withTrashed()->firstOrCreate(
        ['email' => 'brandnew@example.com'],
        ['name' => 'Brand New']
    );

    expect($user->wasRecentlyCreated)->toBeTrue();
    expect(User::count())->toBe($count + 1);
});

it('firstOrCreate without withTrashed cannot create duplicate due to unique constraint', function () {
    $attrs = ['email' => 'duplicatetest@example.com'];
    $extra = ['name' => 'Original'];

    $original = User::create(array_merge($attrs, $extra));
    $original->delete();

    $originalCount = User::withTrashed()->count();

    try {
        User::firstOrCreate($attrs, $extra);
    } catch (Throwable $e) {
        // Expected: unique constraint on email prevents duplicate
    }

    expect(User::withTrashed()->count())->toBe($originalCount);
});
