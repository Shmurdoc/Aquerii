<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fix model_has_roles: model_id needs to be uuid for UUID-based User models
        if (Schema::hasTable('model_has_roles')) {
            Schema::table('model_has_roles', function (Blueprint $table) {
                $table->dropForeign(['role_id']);
                $table->dropPrimary('model_has_roles_role_model_type_primary');
                $table->dropIndex('model_has_roles_model_id_model_type_index');
                $table->dropColumn('model_id');
            });

            Schema::table('model_has_roles', function (Blueprint $table) {
                $table->uuid('model_id')->after('model_type');
                $table->primary(['role_id', 'model_id', 'model_type'], 'model_has_roles_role_model_type_primary');
                $table->index(['model_id', 'model_type'], 'model_has_roles_model_id_model_type_index');
                $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            });
        }

        // Fix model_has_permissions: model_id needs to be uuid for UUID-based User models
        if (Schema::hasTable('model_has_permissions')) {
            Schema::table('model_has_permissions', function (Blueprint $table) {
                $table->dropForeign(['permission_id']);
                $table->dropPrimary('model_has_permissions_permission_model_type_primary');
                $table->dropIndex('model_has_permissions_permission_id_model_type_index');
                $table->dropColumn('model_id');
            });

            Schema::table('model_has_permissions', function (Blueprint $table) {
                $table->uuid('model_id')->after('model_type');
                $table->primary(['permission_id', 'model_id', 'model_type'], 'model_has_permissions_permission_model_type_primary');
                $table->index(['permission_id', 'model_type'], 'model_has_permissions_permission_id_model_type_index');
                $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::table('model_has_roles', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropPrimary('model_has_roles_role_model_type_primary');
            $table->dropIndex('model_has_roles_model_id_model_type_index');
            $table->dropColumn('model_id');
        });

        Schema::table('model_has_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('model_id')->after('model_type');
            $table->primary(['role_id', 'model_id', 'model_type'], 'model_has_roles_role_model_type_primary');
            $table->index(['model_id', 'model_type'], 'model_has_roles_model_id_model_type_index');
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
        });

        Schema::table('model_has_permissions', function (Blueprint $table) {
            $table->dropForeign(['permission_id']);
            $table->dropPrimary('model_has_permissions_permission_model_type_primary');
            $table->dropIndex('model_has_permissions_permission_id_model_type_index');
            $table->dropColumn('model_id');
        });

        Schema::table('model_has_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('model_id')->after('model_type');
            $table->primary(['permission_id', 'model_id', 'model_type'], 'model_has_permissions_permission_model_type_primary');
            $table->index(['permission_id', 'model_type'], 'model_has_permissions_permission_id_model_type_index');
            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
        });
    }
};
