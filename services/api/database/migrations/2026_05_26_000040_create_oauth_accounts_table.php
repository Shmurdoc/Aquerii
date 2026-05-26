<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('oauth_accounts')) {
            Schema::create('oauth_accounts', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('user_id');
                $table->string('provider', 50);
                $table->string('provider_user_id');
                $table->text('access_token');
                $table->text('refresh_token')->nullable();
                $table->timestampTz('expires_at')->nullable();
                $table->jsonb('scopes')->nullable();
                $table->timestampsTz();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->unique(['provider', 'provider_user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_accounts');
    }
};
