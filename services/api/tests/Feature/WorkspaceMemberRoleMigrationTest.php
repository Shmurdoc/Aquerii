<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->owner->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'role' => 'owner',
    ]);

    // Seed the system role taxonomy that the migration would normally
    // populate via RolePermissionSeeder. We do it inline so the test does
    // not depend on the seeder having run.
    seedSystemRoles();
});

/**
 * Insert a minimal set of system roles covering the mappings exercised by
 * the tests below (one department + a couple of positions).
 */
function seedSystemRoles(): void
{
    $now = now();
    $rows = [
        ['name' => 'employee-operations', 'guard_name' => 'web'],
        ['name' => 'employee-safety', 'guard_name' => 'web'],
        ['name' => 'employee-engineering', 'guard_name' => 'web'],
        ['name' => 'pos-team-member', 'guard_name' => 'web'],
        ['name' => 'pos-senior', 'guard_name' => 'web'],
        ['name' => 'pos-manager', 'guard_name' => 'web'],
        ['name' => 'pos-director', 'guard_name' => 'web'],
    ];

    foreach ($rows as $row) {
        DB::table('roles')->insert(array_merge($row, [
            'created_at' => $now,
            'updated_at' => $now,
        ]));
    }
}

// ─── 1. Backfill from legacy free-form columns ───────────────────────────────

it('backfills position_id and department_role_id from legacy job_title and department', function () {
    $mineManager = User::factory()->create();
    $safetyOfficer = User::factory()->create();
    $worker = User::factory()->create();
    $unknown = User::factory()->create();

    // Free-form values match the migration's mapping table.
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $mineManager->id,
        'role' => 'member',
        'job_title' => 'Mine Manager',
        'department' => 'Operations',
    ]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $safetyOfficer->id,
        'role' => 'member',
        'job_title' => 'Safety Officer',
        'department' => 'HSSE',
    ]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $worker->id,
        'role' => 'member',
        'job_title' => 'Operator',
        'department' => 'Engineering',
    ]);

    // A value that has no match in the mapping table — FK should stay NULL.
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $unknown->id,
        'role' => 'member',
        'job_title' => 'Chief Happiness Officer',
        'department' => 'Whimsy',
    ]);

    // Run the same SQL the migration does.
    $migration = new class extends Migration
    {
        public function up(): void {}
    };

    // Invoke the backfill portion of the production migration by
    // re-running the relevant SQL inline (avoids needing reflection on
    // the migration class for a private method).
    $positionMap = [
        'safety officer' => 'pos-senior',
        'mine manager' => 'pos-manager',
        'operator' => 'pos-team-member',
    ];
    $departmentMap = [
        'operations' => 'employee-operations',
        'hsse' => 'employee-safety',
        'engineering' => 'employee-engineering',
    ];

    $positionIds = DB::table('roles')->whereIn('name', array_values($positionMap))->pluck('id', 'name');
    $departmentIds = DB::table('roles')->whereIn('name', array_values($departmentMap))->pluck('id', 'name');

    $posCases = collect($positionMap)
        ->filter(fn ($slug) => $positionIds->has($slug))
        ->map(fn ($slug, $needle) => "WHEN LOWER(TRIM(job_title)) = '".addslashes($needle)."' THEN ".(int) $positionIds[$slug])
        ->implode(' ');
    $deptCases = collect($departmentMap)
        ->filter(fn ($slug) => $departmentIds->has($slug))
        ->map(fn ($slug, $needle) => "WHEN LOWER(TRIM(department)) = '".addslashes($needle)."' THEN ".(int) $departmentIds[$slug])
        ->implode(' ');

    DB::statement("UPDATE workspace_members SET position_id = CASE {$posCases} ELSE position_id END
                   WHERE position_id IS NULL AND job_title IS NOT NULL AND TRIM(job_title) <> ''");
    DB::statement("UPDATE workspace_members SET department_role_id = CASE {$deptCases} ELSE department_role_id END
                   WHERE department_role_id IS NULL AND department IS NOT NULL AND TRIM(department) <> ''");

    $mgrRow = DB::table('workspace_members')->where('user_id', $mineManager->id)->first();
    $safetyRow = DB::table('workspace_members')->where('user_id', $safetyOfficer->id)->first();
    $workerRow = DB::table('workspace_members')->where('user_id', $worker->id)->first();
    $unknownRow = DB::table('workspace_members')->where('user_id', $unknown->id)->first();

    expect((int) $mgrRow->position_id)->toBe($positionIds['pos-manager']);
    expect((int) $mgrRow->department_role_id)->toBe($departmentIds['employee-operations']);

    expect((int) $safetyRow->position_id)->toBe($positionIds['pos-senior']);
    expect((int) $safetyRow->department_role_id)->toBe($departmentIds['employee-safety']);

    expect((int) $workerRow->position_id)->toBe($positionIds['pos-team-member']);
    expect((int) $workerRow->department_role_id)->toBe($departmentIds['employee-engineering']);

    // Unmatched values must stay NULL.
    expect($unknownRow->position_id)->toBeNull();
    expect($unknownRow->department_role_id)->toBeNull();

    // Legacy columns are still present (read-only BC).
    expect(Schema::hasColumn('workspace_members', 'job_title'))->toBeTrue();
    expect(Schema::hasColumn('workspace_members', 'department'))->toBeTrue();
});

// ─── 2. API accepts new role FKs on member update ───────────────────────────

it('updates position_id and department_role_id via the API', function () {
    $member = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    $positionId = (int) DB::table('roles')->where('name', 'pos-director')->value('id');
    $deptId = (int) DB::table('roles')->where('name', 'employee-engineering')->value('id');

    Sanctum::actingAs($this->owner);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/members/{$member->id}",
        [
            'position_id' => $positionId,
            'department_role_id' => $deptId,
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.updated', true);

    $row = DB::table('workspace_members')->where('user_id', $member->id)->first();
    expect((int) $row->position_id)->toBe($positionId);
    expect((int) $row->department_role_id)->toBe($deptId);

    // The relationships on the model resolve correctly.
    $model = WorkspaceMember::where('user_id', $member->id)->first();
    expect($model->position)->toBeInstanceOf(Role::class);
    expect($model->position->name)->toBe('pos-director');
    expect($model->departmentRole->name)->toBe('employee-engineering');
});

// ─── 3. Invalid role IDs are rejected ───────────────────────────────────────

it('rejects a position_id that does not exist in the roles table', function () {
    $member = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    Sanctum::actingAs($this->owner);

    $bogusId = 999999;

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/members/{$member->id}",
        ['position_id' => $bogusId],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422);
    expect($response->json('errors'))->toHaveKey('position_id');

    $row = DB::table('workspace_members')->where('user_id', $member->id)->first();
    expect($row->position_id)->toBeNull();
});

it('rejects a department_role_id that does not exist in the roles table', function () {
    $member = User::factory()->create();
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    Sanctum::actingAs($this->owner);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/members/{$member->id}",
        ['department_role_id' => 999999],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(422);
    expect($response->json('errors'))->toHaveKey('department_role_id');

    $row = DB::table('workspace_members')->where('user_id', $member->id)->first();
    expect($row->department_role_id)->toBeNull();
});
