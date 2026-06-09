<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_companies', function (Blueprint $table) {
            if (! Schema::hasColumn('crm_companies', 'parent_id')) {
                $table->uuid('parent_id')->nullable()->after('name');
                $table->foreign('parent_id')->references('id')->on('crm_companies')->nullOnDelete();
                $table->index('parent_id');
            }
            if (! Schema::hasColumn('crm_companies', 'website')) {
                $table->string('website', 500)->nullable()->after('domain');
            }
            if (! Schema::hasColumn('crm_companies', 'address')) {
                $table->text('address')->nullable()->after('phone');
            }
            if (! Schema::hasColumn('crm_companies', 'notes')) {
                $table->text('notes')->nullable()->after('address');
            }
        });
    }

    public function down(): void
    {
        Schema::table('crm_companies', function (Blueprint $table) {
            if (Schema::hasColumn('crm_companies', 'parent_id')) {
                $table->dropForeign(['parent_id']);
                $table->dropColumn('parent_id');
            }
            foreach (['website', 'address', 'notes'] as $col) {
                if (Schema::hasColumn('crm_companies', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
