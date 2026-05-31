<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('crm_contacts', 'stage_id')) {
            Schema::table('crm_contacts', function (Blueprint $table) {
                $table->uuid('stage_id')->nullable()->after('company_id');
                $table->foreign('stage_id')->references('id')->on('crm_pipeline_stages')->nullOnDelete();
            });
        }

        if (! Schema::hasColumn('crm_deals', 'position')) {
            Schema::table('crm_deals', function (Blueprint $table) {
                $table->unsignedBigInteger('position')->default(0)->after('probability');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('crm_contacts', 'stage_id')) {
            Schema::table('crm_contacts', function (Blueprint $table) {
                $table->dropForeign(['stage_id']);
                $table->dropColumn('stage_id');
            });
        }

        if (Schema::hasColumn('crm_deals', 'position')) {
            Schema::table('crm_deals', function (Blueprint $table) {
                $table->dropColumn('position');
            });
        }
    }
};
