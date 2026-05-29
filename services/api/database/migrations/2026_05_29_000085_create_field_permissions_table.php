<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Field-level permissions (who can see/edit which fields)
        Schema::create('field_permissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('entity_type', 100); // item, board, document, etc.
            $table->string('field_name', 100); // title, description, status, priority, etc.
            $table->string('role', 50); // owner, admin, member, viewer
            $table->string('permission', 20); // read, write, hidden
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->unique(['workspace_id', 'entity_type', 'field_name', 'role']);
            $table->index('workspace_id');
            $table->index(['entity_type', 'field_name']);
        });

        // SCIM 2.0 user provisioning tokens
        Schema::create('scim_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name', 255);
            $table->string('token_hash', 255);
            $table->string('scope', 100)->default('users'); // users, groups
            $table->boolean('is_active')->default(true);
            $table->timestampTz('last_used_at')->nullable();
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->index('workspace_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scim_tokens');
        Schema::dropIfExists('field_permissions');
    }
};
