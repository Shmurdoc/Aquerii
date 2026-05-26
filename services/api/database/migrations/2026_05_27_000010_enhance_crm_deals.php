<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('crm_deals', 'loss_reason')) {
            Schema::table('crm_deals', function (Blueprint $table) {
                $table->string('loss_reason', 50)->nullable();
            });
        }
        if (! Schema::hasColumn('crm_deals', 'loss_details')) {
            Schema::table('crm_deals', function (Blueprint $table) {
                $table->text('loss_details')->nullable();
            });
        }
        if (! Schema::hasColumn('crm_deals', 'forecast_category')) {
            Schema::table('crm_deals', function (Blueprint $table) {
                $table->string('forecast_category', 30)->default('pipeline');
            });
        }
        if (! Schema::hasColumn('crm_deals', 'discount_amount')) {
            Schema::table('crm_deals', function (Blueprint $table) {
                $table->decimal('discount_amount', 12, 2)->nullable();
            });
        }
        if (! Schema::hasColumn('crm_deals', 'discount_type')) {
            Schema::table('crm_deals', function (Blueprint $table) {
                $table->string('discount_type', 20)->default('percentage');
            });
        }
        if (! Schema::hasColumn('crm_deals', 'competitors')) {
            Schema::table('crm_deals', function (Blueprint $table) {
                $table->jsonb('competitors')->nullable();
            });
        }
        if (! Schema::hasColumn('crm_deals', 'last_activity_at')) {
            Schema::table('crm_deals', function (Blueprint $table) {
                $table->timestampTz('last_activity_at')->nullable();
            });
        }
        if (! Schema::hasColumn('crm_deals', 'stage_history')) {
            Schema::table('crm_deals', function (Blueprint $table) {
                $table->jsonb('stage_history')->default('[]');
            });
        }
    }

    public function down(): void
    {
        $columns = [];
        foreach (['loss_reason', 'loss_details', 'forecast_category', 'discount_amount', 'discount_type', 'competitors', 'last_activity_at', 'stage_history'] as $col) {
            if (Schema::hasColumn('crm_deals', $col)) {
                $columns[] = $col;
            }
        }
        if (! empty($columns)) {
            Schema::table('crm_deals', function (Blueprint $table) use ($columns) {
                $table->dropColumn($columns);
            });
        }
    }
};
