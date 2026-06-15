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

it('rejects double clock-in (ghost shift)', function () {
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-in",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(200);

    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-in",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(422);
});

it('rejects clock-out without a prior clock-in', function () {
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-out",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(422);
});

it('records multiple consecutive-day attendance entries', function () {
    DB::table('attendance_logs')->insert([
        'id' => Str::uuid(),
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'clocked_in_at' => now()->subDays(2)->startOfDay()->addHours(7),
        'clocked_out_at' => now()->subDays(2)->startOfDay()->addHours(15),
        'status' => 'present',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('attendance_logs')->insert([
        'id' => Str::uuid(),
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'clocked_in_at' => now()->subDay()->startOfDay()->addHours(7),
        'clocked_out_at' => now()->subDay()->startOfDay()->addHours(15),
        'status' => 'present',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('attendance_logs')->insert([
        'id' => Str::uuid(),
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'clocked_in_at' => now()->startOfDay()->addHours(7),
        'clocked_out_at' => null,
        'status' => 'present',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/attendance/report");
    $response->assertStatus(200);

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.total_entries'))->toBeGreaterThanOrEqual(3);
});

it('records GPS coordinates on clock-out', function () {
    $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-in",
        ['lat' => -25.746111, 'lng' => 28.188056],
        ['Idempotency-Key' => Str::uuid()->toString()]
    )->assertStatus(200);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/hr/attendance/clock-out",
        ['lat' => -25.746200, 'lng' => 28.188100],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200);
    expect($response->json('attendance.clocked_out_lat'))->toEqual(-25.746200);
    expect($response->json('attendance.clocked_out_lng'))->toEqual(28.188100);
});

it('scopes attendance history to current workspace', function () {
    $other = Workspace::factory()->create(['owner_id' => $this->user->id]);
    DB::table('attendance_logs')->insert([
        'id' => Str::uuid(),
        'workspace_id' => $other->id,
        'user_id' => $this->user->id,
        'clocked_in_at' => now()->subHours(2),
        'clocked_out_at' => now()->subHour(),
        'status' => 'present',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/hr/attendance");
    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(0);
});
