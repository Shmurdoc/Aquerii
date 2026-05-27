<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS superadmin');

        if (! Schema::hasTable('superadmin.feature_flags')) {
            Schema::create('superadmin.feature_flags', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->boolean('enabled')->default(false);
                $table->text('description')->nullable();
                $table->jsonb('workspace_ids')->default('[]');
                $table->timestampsTz();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('superadmin.feature_flags');
    }
};
