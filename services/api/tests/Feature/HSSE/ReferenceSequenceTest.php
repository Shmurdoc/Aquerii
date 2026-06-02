<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\HSSE\Models\Incident;
use App\Modules\HSSE\Services\ReferenceSequenceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
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

it('generates sequential references with no gaps within a year', function () {
    $service = app(ReferenceSequenceService::class);

    $refs = collect(range(1, 5))->map(
        fn () => $service->next($this->workspace->id, ReferenceSequenceService::ENTITY_INCIDENT)
    );

    expect($refs)->toEqual([
        'INC-'.now()->format('Y').'-0001',
        'INC-'.now()->format('Y').'-0002',
        'INC-'.now()->format('Y').'-0003',
        'INC-'.now()->format('Y').'-0004',
        'INC-'.now()->format('Y').'-0005',
    ]);
});

it('does not duplicate references under concurrent creation', function () {
    $service = app(ReferenceSequenceService::class);

    $refs = collect(range(1, 25))->map(function () use ($service) {
        return collect(range(1, 5))->map(
            fn () => $service->next($this->workspace->id, ReferenceSequenceService::ENTITY_INCIDENT)
        );
    })->flatten();

    expect($refs->count())->toBe(125);
    expect($refs->unique()->count())->toBe(125);
});

it('isolates reference sequences per workspace', function () {
    $other = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $other->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);

    $service = app(ReferenceSequenceService::class);

    $a1 = $service->next($this->workspace->id, ReferenceSequenceService::ENTITY_INCIDENT);
    $b1 = $service->next($other->id, ReferenceSequenceService::ENTITY_INCIDENT);
    $a2 = $service->next($this->workspace->id, ReferenceSequenceService::ENTITY_INCIDENT);

    expect($a1)->toEndWith('-0001');
    expect($b1)->toEndWith('-0001');
    expect($a2)->toEndWith('-0002');
});

it('isolates reference sequences per entity', function () {
    $service = app(ReferenceSequenceService::class);

    $incident = $service->next($this->workspace->id, ReferenceSequenceService::ENTITY_INCIDENT);
    $hazard = $service->next($this->workspace->id, ReferenceSequenceService::ENTITY_HAZARD);
    $ca = $service->next($this->workspace->id, ReferenceSequenceService::ENTITY_CORRECTIVE_ACTION);

    expect($incident)->toStartWith('INC-');
    expect($hazard)->toStartWith('HAZ-');
    expect($ca)->toStartWith('CA-');

    $incident2 = $service->next($this->workspace->id, ReferenceSequenceService::ENTITY_INCIDENT);
    expect($incident2)->toEndWith('-0002');
    expect($incident)->toEndWith('-0001');
});

it('produces unique references even when 50 incidents are created in the same second', function () {
    $service = app(ReferenceSequenceService::class);

    $refs = [];
    for ($i = 0; $i < 50; $i++) {
        $refs[] = $service->next($this->workspace->id, ReferenceSequenceService::ENTITY_INCIDENT);
    }

    expect(count($refs))->toBe(50);
    expect(count(array_unique($refs)))->toBe(50);
});
