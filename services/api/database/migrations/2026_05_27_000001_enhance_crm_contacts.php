<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('crm_contacts', 'social_links')) {
            Schema::table('crm_contacts', function (Blueprint $table) {
                $table->jsonb('social_links')->nullable();
            });
        }
        if (! Schema::hasColumn('crm_contacts', 'lifecycle_stage')) {
            Schema::table('crm_contacts', function (Blueprint $table) {
                $table->string('lifecycle_stage', 30)->default('lead');
                $table->index('lifecycle_stage');
            });
        }
        if (! Schema::hasColumn('crm_contacts', 'consent_gdpr')) {
            Schema::table('crm_contacts', function (Blueprint $table) {
                $table->boolean('consent_gdpr')->default(false);
            });
        }
        if (! Schema::hasColumn('crm_contacts', 'consent_marketing')) {
            Schema::table('crm_contacts', function (Blueprint $table) {
                $table->boolean('consent_marketing')->default(false);
            });
        }
        if (! Schema::hasColumn('crm_contacts', 'consent_preferences')) {
            Schema::table('crm_contacts', function (Blueprint $table) {
                $table->jsonb('consent_preferences')->nullable();
            });
        }
        if (! Schema::hasColumn('crm_contacts', 'last_touched_at')) {
            Schema::table('crm_contacts', function (Blueprint $table) {
                $table->timestampTz('last_touched_at')->nullable();
                $table->index('last_touched_at');
            });
        }
        if (! Schema::hasColumn('crm_contacts', 'source')) {
            Schema::table('crm_contacts', function (Blueprint $table) {
                $table->string('source', 50)->default('manual');
            });
        }
        if (! Schema::hasColumn('crm_contacts', 'source_url')) {
            Schema::table('crm_contacts', function (Blueprint $table) {
                $table->text('source_url')->nullable();
            });
        }
    }

    public function down(): void
    {
        $columns = [];
        foreach (['social_links', 'lifecycle_stage', 'consent_gdpr', 'consent_marketing', 'consent_preferences', 'last_touched_at', 'source', 'source_url'] as $col) {
            if (Schema::hasColumn('crm_contacts', $col)) {
                $columns[] = $col;
            }
        }
        if (! empty($columns)) {
            Schema::table('crm_contacts', function (Blueprint $table) use ($columns) {
                if (in_array('lifecycle_stage', $columns)) {
                    $table->dropIndex(['lifecycle_stage']);
                }
                if (in_array('last_touched_at', $columns)) {
                    $table->dropIndex(['last_touched_at']);
                }
                $table->dropColumn($columns);
            });
        }
    }
};
