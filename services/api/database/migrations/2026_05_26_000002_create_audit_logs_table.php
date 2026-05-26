<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id')->nullable();
            $table->uuid('user_id')->nullable();
            $table->string('action', 150); // e.g. 'invoice.created', 'workspace.logo_uploaded'
            $table->string('resource_type', 100)->nullable();
            $table->uuid('resource_id')->nullable();
            $table->jsonb('before')->nullable();
            $table->jsonb('after')->nullable();
            $table->jsonb('meta')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestampTz('created_at');
            $table->index(['workspace_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['resource_type', 'resource_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
