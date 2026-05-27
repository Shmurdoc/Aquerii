<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('color', 20)->nullable();
            $table->foreignUuid('manager_id')->nullable()->constrained('workspace_members')->nullOnDelete();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::table('workspace_members', function (Blueprint $table) {
            if (! Schema::hasColumn('workspace_members', 'employee_group_id')) {
                $table->foreignUuid('employee_group_id')->nullable()->after('department')->constrained('employee_groups')->nullOnDelete();
            }
            if (! Schema::hasColumn('workspace_members', 'reports_to')) {
                $table->foreignUuid('reports_to')->nullable()->after('employee_group_id')->constrained('workspace_members')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('workspace_members', function (Blueprint $table) {
            $table->dropForeign(['employee_group_id']);
            $table->dropForeign(['reports_to']);
            $table->dropColumn(['employee_group_id', 'reports_to']);
        });

        Schema::dropIfExists('employee_groups');
    }
};
