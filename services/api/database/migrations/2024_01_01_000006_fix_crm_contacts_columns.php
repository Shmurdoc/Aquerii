<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_contacts', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_contacts', 'first_name')) {
                $table->string('first_name')->default('')->after('company_id');
            }
            if (!Schema::hasColumn('crm_contacts', 'last_name')) {
                $table->string('last_name')->default('')->after('first_name');
            }
            if (!Schema::hasColumn('crm_contacts', 'tags')) {
                $table->json('tags')->nullable()->after('custom_fields');
            }
            if (!Schema::hasColumn('crm_contacts', 'lead_score')) {
                $table->unsignedSmallInteger('lead_score')->default(0)->after('tags');
            }
        });
    }

    public function down(): void
    {
        Schema::table('crm_contacts', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'last_name', 'tags', 'lead_score']);
        });
    }
};
