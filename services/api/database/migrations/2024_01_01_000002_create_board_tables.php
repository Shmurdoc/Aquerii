<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('boards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('icon', 50)->nullable();
            $table->string('color', 20)->nullable();
            $table->string('type', 50)->default('main');
            $table->string('visibility', 50)->default('workspace');
            $table->string('default_view', 50)->default('kanban');
            $table->float('position')->default(0);
            $table->jsonb('settings')->default('{}');
            $table->uuid('created_by');
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users');
        });

        Schema::create('board_columns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('board_id');
            $table->string('name');
            $table->string('type', 50);
            $table->float('position')->default(0);
            $table->integer('width')->default(200);
            $table->jsonb('settings')->default('{}');
            $table->boolean('is_system')->default(false);
            $table->timestampsTz();
            $table->foreign('board_id')->references('id')->on('boards')->cascadeOnDelete();
        });

        Schema::create('board_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('board_id');
            $table->string('name')->default('New Group');
            $table->string('color', 20)->nullable();
            $table->float('position')->default(0);
            $table->boolean('collapsed')->default(false);
            $table->timestampsTz();
            $table->foreign('board_id')->references('id')->on('boards')->cascadeOnDelete();
        });

        Schema::create('items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('board_id');
            $table->uuid('group_id');
            $table->uuid('parent_id')->nullable();
            $table->text('title')->default('New Item');
            $table->jsonb('description')->nullable();
            $table->float('position')->default(0);
            $table->string('status', 100)->nullable();
            $table->string('priority', 20)->nullable();
            $table->timestampTz('due_date')->nullable();
            $table->timestampTz('reminder_at')->nullable();
            $table->decimal('estimated_hours', 8, 2)->nullable();
            $table->decimal('tracked_hours', 8, 2)->default(0);
            $table->jsonb('column_values')->default('{}');
            $table->bigInteger('version')->default(1);
            $table->uuid('created_by');
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->foreign('board_id')->references('id')->on('boards')->cascadeOnDelete();
            $table->foreign('group_id')->references('id')->on('board_groups')->cascadeOnDelete();
            $table->foreign('parent_id')->references('id')->on('items')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users');
        });

        Schema::create('item_assignees', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('item_id');
            $table->uuid('user_id');
            $table->uuid('assigned_by')->nullable();
            $table->timestampTz('assigned_at')->useCurrent();
            $table->foreign('item_id')->references('id')->on('items')->cascadeOnDelete();
            $table->unique(['item_id', 'user_id']);
        });

        Schema::create('item_dependencies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('item_id');
            $table->uuid('depends_on_id');
            $table->string('type', 50)->default('finish_to_start');
            $table->foreign('item_id')->references('id')->on('items')->cascadeOnDelete();
            $table->foreign('depends_on_id')->references('id')->on('items')->cascadeOnDelete();
            $table->unique(['item_id', 'depends_on_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_dependencies');
        Schema::dropIfExists('item_assignees');
        Schema::dropIfExists('items');
        Schema::dropIfExists('board_groups');
        Schema::dropIfExists('board_columns');
        Schema::dropIfExists('boards');
    }
};
