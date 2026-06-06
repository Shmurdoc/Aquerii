<?php

use App\Core\Http\Middleware\RequireAccountType;
use App\Core\Models\User;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Route::middleware(['auth:sanctum', RequireAccountType::class.':superadmin_creator,platform_admin'])
        ->get('/_test/require-account-type', fn () => response()->json(['ok' => true]));
});

it('allows superadmin_creator through the require.account_type gate', function () {
    $user = User::factory()->create(['account_type' => 'superadmin_creator']);
    Sanctum::actingAs($user);

    $this->getJson('/_test/require-account-type')
        ->assertOk()
        ->assertJson(['ok' => true]);
});

it('allows platform_admin through the require.account_type gate', function () {
    $user = User::factory()->create(['account_type' => 'platform_admin']);
    Sanctum::actingAs($user);

    $this->getJson('/_test/require-account-type')
        ->assertOk()
        ->assertJson(['ok' => true]);
});

it('blocks subscriber through the require.account_type gate', function () {
    $user = User::factory()->create(['account_type' => 'subscriber']);
    Sanctum::actingAs($user);

    $this->getJson('/_test/require-account-type')
        ->assertStatus(403);
});
