<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspace_members', function (Blueprint $table) {
            if (! Schema::hasColumn('workspace_members', 'job_title')) {
                $table->string('job_title', 200)->nullable()->after('role');
            }
            if (! Schema::hasColumn('workspace_members', 'department')) {
                $table->string('department', 200)->nullable()->after('job_title');
            }
            if (! Schema::hasColumn('workspace_members', 'salary')) {
                $table->decimal('salary', 15, 2)->nullable()->after('department');
            }
            if (! Schema::hasColumn('workspace_members', 'salary_currency')) {
                $table->string('salary_currency', 3)->default('USD')->after('salary');
            }
            if (! Schema::hasColumn('workspace_members', 'phone')) {
                $table->string('phone', 50)->nullable()->after('salary_currency');
            }
            if (! Schema::hasColumn('workspace_members', 'emergency_contact')) {
                $table->text('emergency_contact')->nullable()->after('phone');
            }
            if (! Schema::hasColumn('workspace_members', 'employed_at')) {
                $table->date('employed_at')->nullable()->after('emergency_contact');
            }
        });
    }

    public function down(): void
    {
        Schema::table('workspace_members', function (Blueprint $table) {
            $columns = ['job_title', 'department', 'salary', 'salary_currency', 'phone', 'emergency_contact', 'employed_at'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('workspace_members', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
