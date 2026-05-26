<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * workspace_members was created with only created_at.
 * The WorkspaceController inserts/updates updated_at — add the column.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspace_members', function (Blueprint $table) {
            $table->timestampTz('updated_at')->nullable()->after('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('workspace_members', function (Blueprint $table) {
            $table->dropColumn('updated_at');
        });
    }
};
