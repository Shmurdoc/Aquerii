<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_deals', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_deals', 'won_at')) {
                $table->timestamp('won_at')->nullable()->after('lost_reason');
            }
            if (!Schema::hasColumn('crm_deals', 'lost_at')) {
                $table->timestamp('lost_at')->nullable()->after('won_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('crm_deals', function (Blueprint $table) {
            $table->dropColumn(['won_at', 'lost_at']);
        });
    }
};
