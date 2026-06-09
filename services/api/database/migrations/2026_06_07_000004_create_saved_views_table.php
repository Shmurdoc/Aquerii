<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Saved views let a user pin a particular (filters + sort + columns) state
     * of a list view (deals table, contacts board, calendar, etc.) and recall
     * it later. `is_shared = true` exposes the view to every workspace member
     * so a sales manager can author a "stale deals" filter once and have the
     * whole team see it. Per-user views remain private to their owner.
     *
     * `filters`, `sort`, and `columns` are opaque jsonb blobs — the frontend
     * defines the schema. We store them as jsonb so Postgres can index inside
     * them later (e.g. find all views referencing a column) without a migration.
     */
    public function up(): void
    {
        Schema::create('saved_views', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('entity_type', 64);
            $table->jsonb('filters')->default('[]');
            $table->jsonb('sort')->nullable();
            $table->jsonb('columns')->nullable();
            $table->boolean('is_shared')->default(false);
            $table->timestampsTz();

            $table->index(['workspace_id', 'entity_type']);
            $table->index(['user_id', 'entity_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_views');
    }
};
