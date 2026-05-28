<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_conflicts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('user_id');
            $table->string('entity_type', 100); // item, document, board, etc.
            $table->uuid('entity_id');
            $table->string('operation', 20); // update, delete
            $table->jsonb('local_data'); // what the user tried to save
            $table->jsonb('server_data'); // current server state
            $table->string('resolution', 20)->nullable(); // local, server, merged, dismissed
            $table->jsonb('merged_data')->nullable(); // if resolution is 'merged'
            $table->text('resolution_notes')->nullable();
            $table->timestampTz('resolved_at')->nullable();
            $table->timestampTz('created_at');
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('workspace_id');
            $table->index('user_id');
            $table->index('entity_type');
            $table->index(['entity_type', 'entity_id']);
            $table->index('resolution');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_conflicts');
    }
};
