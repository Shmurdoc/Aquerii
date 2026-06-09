<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_calendar_syncs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('user_id');
            $table->string('provider');
            $table->string('calendar_id');
            $table->string('calendar_name')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampTz('last_synced_at')->nullable();
            $table->jsonb('sync_config')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement('CREATE INDEX idx_crm_cal_sync_user ON crm_calendar_syncs (user_id)');
        DB::statement('CREATE INDEX idx_crm_cal_sync_provider ON crm_calendar_syncs (provider)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_calendar_syncs');
    }
};
