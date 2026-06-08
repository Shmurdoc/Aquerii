<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\CompetencyType;
use App\Modules\Competency\Models\CofRecord;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->workspace = Workspace::factory()->create();
    $this->user = User::factory()->create();
    $this->worker = User::factory()->create();
    $this->hsseOfficer = User::factory()->create();
    $this->adminUser = User::factory()->create();

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->worker->id,
        'role' => 'member',
        'status' => 'active',
        'overall_compliance_status' => 'compliant',
    ]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->hsseOfficer->id,
        'role' => 'contractor_hsse_officer',
        'status' => 'active',
    ]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->adminUser->id,
        'role' => 'contractor_admin',
        'status' => 'active',
    ]);

    $hsseRoleId = (string) Str::uuid();
    $adminRoleId = (string) Str::uuid();

    DB::table('roles')->insert([
        ['id' => $hsseRoleId, 'name' => 'contractor_hsse_officer', 'guard_name' => 'web', 'workspace_id' => $this->workspace->id],
        ['id' => $adminRoleId, 'name' => 'contractor_admin', 'guard_name' => 'web', 'workspace_id' => $this->workspace->id],
    ]);

    DB::table('model_has_roles')->insert([
        ['role_id' => $hsseRoleId, 'model_type' => User::class, 'model_id' => $this->hsseOfficer->id],
        ['role_id' => $adminRoleId, 'model_type' => User::class, 'model_id' => $this->adminUser->id],
    ]);

    $this->competencyType = CompetencyType::factory()->create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Blasting License',
    ]);
});

it('sends 90-day notification for competency records expiring within 90 days', function () {
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->worker->id,
        'competency_type_id' => $this->competencyType->id,
        'expires_at' => now()->addDays(60),
        'status' => 'active',
    ]);

    $this->artisan('app:check-cert-expiry')
        ->assertSuccessful();

    expect(DB::table('notifications')->where('user_id', $this->hsseOfficer->id)->count())->toBe(1);
    expect(DB::table('notifications')->where('user_id', $this->adminUser->id)->count())->toBe(0);
});

it('sends 30-day notification to both HSSE officer and contractor admin', function () {
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->worker->id,
        'competency_type_id' => $this->competencyType->id,
        'expires_at' => now()->addDays(15),
        'status' => 'active',
    ]);

    $this->artisan('app:check-cert-expiry')
        ->assertSuccessful();

    expect(DB::table('notifications')->where('user_id', $this->hsseOfficer->id)->count())->toBe(1);
    expect(DB::table('notifications')->where('user_id', $this->adminUser->id)->count())->toBe(1);
});

it('flips compliance status to non_compliant for expired records and notifies all parties', function () {
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->worker->id,
        'competency_type_id' => $this->competencyType->id,
        'expires_at' => now()->subDay(),
        'status' => 'expired',
    ]);

    $this->artisan('app:check-cert-expiry')
        ->assertSuccessful();

    $member = WorkspaceMember::where('user_id', $this->worker->id)
        ->where('workspace_id', $this->workspace->id)
        ->first();

    expect($member->overall_compliance_status)->toBe('non_compliant');
    expect(DB::table('notifications')->where('user_id', $this->hsseOfficer->id)->count())->toBe(1);
    expect(DB::table('notifications')->where('user_id', $this->adminUser->id)->count())->toBe(1);
});

it('is idempotent and does not send duplicate notifications', function () {
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->worker->id,
        'competency_type_id' => $this->competencyType->id,
        'expires_at' => now()->addDays(15),
        'status' => 'active',
    ]);

    $this->artisan('app:check-cert-expiry');
    $firstCount = DB::table('notifications')->count();
    $logCount = DB::table('cert_notification_logs')->count();

    $this->artisan('app:check-cert-expiry');
    $secondCount = DB::table('notifications')->count();

    expect($secondCount)->toBe($firstCount);
});

it('processes CofRecord expiries correctly', function () {
    CofRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->worker->id,
        'expires_at' => now()->addDays(15),
        'type' => 'medical',
        'status' => 'active',
    ]);

    $this->artisan('app:check-cert-expiry')
        ->assertSuccessful();

    expect(DB::table('notifications')->where('user_id', $this->hsseOfficer->id)->count())->toBe(1);
    expect(DB::table('notifications')->where('user_id', $this->adminUser->id)->count())->toBe(1);
});

it('skips records outside the 90-day window', function () {
    CompetencyRecord::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->worker->id,
        'competency_type_id' => $this->competencyType->id,
        'expires_at' => now()->addDays(200),
        'status' => 'active',
    ]);

    $this->artisan('app:check-cert-expiry')
        ->assertSuccessful();

    expect(DB::table('notifications')->count())->toBe(0);
});

it('works with no expiring records at all', function () {
    $this->artisan('app:check-cert-expiry')
        ->assertSuccessful();
});
