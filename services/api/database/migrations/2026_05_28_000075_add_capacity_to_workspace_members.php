<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspace_members', function (Blueprint $table) {
            $table->decimal('weekly_capacity_hours', 5, 2)->default(40)->after('salary_currency');
            $table->text('capacity_notes')->nullable()->after('weekly_capacity_hours');
        });
    }

    public function down(): void
    {
        Schema::table('workspace_members', function (Blueprint $table) {
            $table->dropColumn(['weekly_capacity_hours', 'capacity_notes']);
        });
    }
};
