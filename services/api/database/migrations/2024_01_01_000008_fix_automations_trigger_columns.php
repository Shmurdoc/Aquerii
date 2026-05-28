<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('automations', function (Blueprint $table) {
            if (!Schema::hasColumn('automations', 'trigger_type')) {
                $table->string('trigger_type')->default('')->after('name');
            }
            if (!Schema::hasColumn('automations', 'trigger_config')) {
                $table->json('trigger_config')->nullable()->after('trigger_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('automations', function (Blueprint $table) {
            $table->dropColumn(['trigger_type', 'trigger_config']);
        });
    }
};
