<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('workspace_id');
                $table->uuid('user_id');
                $table->string('action', 100);
                $table->string('resource_type', 100);
                $table->string('resource_id', 100)->nullable();
                $table->jsonb('before')->nullable();
                $table->jsonb('after')->nullable();
                $table->jsonb('meta')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->timestampsTz();

                $table->index(['workspace_id', 'action']);
                $table->index('resource_type');
                $table->index('user_id');
                $table->index('created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
