<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scim_identities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('user_id');
            $table->string('external_id', 255);
            $table->jsonb('metadata')->nullable();
            $table->timestampTz('last_synced_at')->nullable();
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            $table->unique(['workspace_id', 'external_id']);
            $table->unique(['workspace_id', 'user_id']);
            $table->index(['workspace_id', 'last_synced_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scim_identities');
    }
};
