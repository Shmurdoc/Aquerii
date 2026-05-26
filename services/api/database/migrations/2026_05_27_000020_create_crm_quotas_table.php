<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_quotas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('user_id');
            $table->decimal('quota_amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('period_type', 20);
            $table->smallInteger('year');
            $table->smallInteger('month')->nullable();
            $table->smallInteger('quarter')->nullable();
            $table->decimal('attainment', 12, 2)->nullable();
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('workspace_id');
            $table->index('user_id');
        });

        DB::statement('CREATE UNIQUE INDEX crm_quotas_unique ON crm_quotas (workspace_id, user_id, period_type, year, COALESCE(month, 0), COALESCE(quarter, 0))');
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_quotas');
    }
};
