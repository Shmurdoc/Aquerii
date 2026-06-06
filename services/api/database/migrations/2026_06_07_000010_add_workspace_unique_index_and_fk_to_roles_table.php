<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('roles')) {
            return;
        }

        Schema::table('roles', function (Blueprint $table) {
            try {
                $table->unique(['workspace_id', 'name'], 'roles_workspace_id_name_unique');
            } catch (Exception) {
            }

            try {
                $table->foreign('workspace_id', 'roles_workspace_id_foreign')
                    ->references('id')
                    ->on('workspaces')
                    ->onDelete('cascade');
            } catch (Exception) {
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('roles')) {
            return;
        }

        Schema::table('roles', function (Blueprint $table) {
            try {
                $table->dropForeign('roles_workspace_id_foreign');
            } catch (Exception) {
            }

            try {
                $table->dropUnique('roles_workspace_id_name_unique');
            } catch (Exception) {
            }
        });
    }
};
