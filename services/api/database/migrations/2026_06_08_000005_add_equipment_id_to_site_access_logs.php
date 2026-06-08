<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_access_logs', function (Blueprint $table) {
            $table->foreignUuid('equipment_id')->nullable()->after('worker_id')->constrained()->nullOnDelete();
            $table->dropForeign(['worker_id']);
            $table->uuid('worker_id')->nullable()->change();
            $table->foreign('worker_id')->references('id')->on('workspace_members')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('site_access_logs', function (Blueprint $table) {
            $table->dropForeign(['worker_id']);
            $table->uuid('worker_id')->change();
            $table->foreign('worker_id')->references('id')->on('workspace_members')->cascadeOnDelete();
            $table->dropColumn('equipment_id');
        });
    }
};
