<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_segments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->jsonb('criteria');
            $table->integer('cached_count')->default(0);
            $table->timestampTz('last_calculated_at')->nullable();
            $table->boolean('is_dynamic')->default(true);
            $table->jsonb('tags')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement('CREATE INDEX idx_mkt_segments_workspace ON marketing_segments (workspace_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_segments');
    }
};
