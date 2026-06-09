<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            if (! Schema::hasColumn('roles', 'is_system')) {
                $table->boolean('is_system')->default(false)->after('guard_name');
                $table->index('is_system');
            }

            if (! Schema::hasColumn('roles', 'workspace_id')) {
                $table->uuid('workspace_id')->nullable()->after('is_system');
                $table->index('workspace_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            if (Schema::hasColumn('roles', 'workspace_id')) {
                $table->dropIndex(['workspace_id']);
                $table->dropColumn('workspace_id');
            }

            if (Schema::hasColumn('roles', 'is_system')) {
                $table->dropIndex(['is_system']);
                $table->dropColumn('is_system');
            }
        });
    }
};
