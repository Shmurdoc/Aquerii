<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('model_has_roles')) {
            $table = DB::getDoctrineSchemaManager()->listTableDetails('model_has_roles');

            // Drop foreign keys
            foreach ($table->getForeignKeys() as $fk) {
                if (in_array('model_id', $fk->getLocalColumns())) {
                    DB::statement('ALTER TABLE model_has_roles DROP CONSTRAINT "'.$fk->getName().'"');
                }
            }

            // Drop indexes
            foreach ($table->getIndexes() as $index) {
                if ($index->isPrimary() || in_array('model_id', $index->getColumns())) {
                    DB::statement('DROP INDEX IF EXISTS "'.$index->getName().'"');
                }
            }

            Schema::table('model_has_roles', function (Blueprint $table) {
                $table->dropColumn('model_id');
            });

            Schema::table('model_has_roles', function (Blueprint $table) {
                $table->uuid('model_id')->after('model_type');
            });

            // Recreate primary key
            $hasTeam = Schema::hasColumn('model_has_roles', 'team_id');
            if ($hasTeam) {
                DB::statement('ALTER TABLE model_has_roles ADD PRIMARY KEY (team_id, role_id, model_id, model_type)');
            } else {
                DB::statement('ALTER TABLE model_has_roles ADD PRIMARY KEY (role_id, model_id, model_type)');
            }

            DB::statement('CREATE INDEX model_has_roles_model_id_model_type_index ON model_has_roles (model_id, model_type)');

            DB::statement('ALTER TABLE model_has_roles ADD CONSTRAINT model_has_roles_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE');
        }

        if (Schema::hasTable('model_has_permissions')) {
            $table = DB::getDoctrineSchemaManager()->listTableDetails('model_has_permissions');

            // Drop foreign keys
            foreach ($table->getForeignKeys() as $fk) {
                if (in_array('model_id', $fk->getLocalColumns())) {
                    DB::statement('ALTER TABLE model_has_permissions DROP CONSTRAINT "'.$fk->getName().'"');
                }
            }

            // Drop indexes
            foreach ($table->getIndexes() as $index) {
                if ($index->isPrimary() || in_array('model_id', $index->getColumns())) {
                    DB::statement('DROP INDEX IF EXISTS "'.$index->getName().'"');
                }
            }

            Schema::table('model_has_permissions', function (Blueprint $table) {
                $table->dropColumn('model_id');
            });

            Schema::table('model_has_permissions', function (Blueprint $table) {
                $table->uuid('model_id')->after('model_type');
            });

            // Recreate primary key
            $hasTeam = Schema::hasColumn('model_has_permissions', 'team_id');
            if ($hasTeam) {
                DB::statement('ALTER TABLE model_has_permissions ADD PRIMARY KEY (team_id, permission_id, model_id, model_type)');
            } else {
                DB::statement('ALTER TABLE model_has_permissions ADD PRIMARY KEY (permission_id, model_id, model_type)');
            }

            DB::statement('CREATE INDEX model_has_permissions_permission_id_model_type_index ON model_has_permissions (permission_id, model_type)');

            DB::statement('ALTER TABLE model_has_permissions ADD CONSTRAINT model_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE');
        }
    }

    public function down(): void
    {
        // Reverse is complex and risky; truncate is safer for a dev migration
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('model_has_roles');

        // Re-create tables from scratch via Spatie migration defaults
        Schema::create('model_has_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id');
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            $table->index(['model_id', 'model_type'], 'model_has_roles_model_id_model_type_index');
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            $table->primary(['role_id', 'model_id', 'model_type'], 'model_has_roles_role_model_type_primary');
        });

        Schema::create('model_has_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('permission_id');
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            $table->index(['model_id', 'model_type'], 'model_has_permissions_permission_id_model_type_index');
            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            $table->primary(['permission_id', 'model_id', 'model_type'], 'model_has_permissions_permission_model_type_primary');
        });
    }
};
