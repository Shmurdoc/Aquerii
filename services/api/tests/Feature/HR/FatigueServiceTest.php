<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Services\FatigueService;
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

it('returns zero hours when no attendance exists', function () {
    $result = (new FatigueService)->check($this->user->id, $this->workspace->id);

    expect($result->hours_worked)->toBe(0.0);
    expect($result->soft_blocked)->toBeFalse();
    expect($result->hard_blocked)->toBeFalse();
});

it('calculates partial shift correctly', function () {
    DB::table('attendance_logs')->insert([
        'id' => Str::uuid(),
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'clocked_in_at' => now()->subHours(5),
        'clocked_out_at' => now()->subHours(2),
        'status' => 'present',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $result = (new FatigueService)->check($this->user->id, $this->workspace->id);

    expect($result->hours_worked)->toBe(3.0);
    expect($result->soft_blocked)->toBeFalse();
    expect($result->hard_blocked)->toBeFalse();
});

it('crosses soft threshold at 12 hours', function () {
    DB::table('attendance_logs')->insert([
        'id' => Str::uuid(),
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'clocked_in_at' => now()->subHours(14),
        'clocked_out_at' => now()->subHours(2),
        'status' => 'present',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $result = (new FatigueService)->check($this->user->id, $this->workspace->id);

    expect($result->hours_worked)->toBe(12.0);
    expect($result->soft_blocked)->toBeTrue();
    expect($result->hard_blocked)->toBeFalse();
});

it('crosses hard threshold at 16 hours', function () {
    DB::table('attendance_logs')->insert([
        'id' => Str::uuid(),
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'clocked_in_at' => now()->subHours(18),
        'clocked_out_at' => now()->subHours(1),
        'status' => 'present',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $result = (new FatigueService)->check($this->user->id, $this->workspace->id);

    expect($result->hours_worked)->toBe(17.0);
    expect($result->soft_blocked)->toBeTrue();
    expect($result->hard_blocked)->toBeTrue();
});

it('treats active shift as ongoing', function () {
    DB::table('attendance_logs')->insert([
        'id' => Str::uuid(),
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'clocked_in_at' => now()->subHours(10),
        'clocked_out_at' => null,
        'status' => 'present',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $result = (new FatigueService)->check($this->user->id, $this->workspace->id);

    expect($result->hours_worked)->toBeGreaterThanOrEqual(10.0);
    expect($result->soft_blocked)->toBeFalse();
});
