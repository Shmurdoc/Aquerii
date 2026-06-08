<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_access_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('worker_id');
            $table->string('direction', 10);
            $table->timestamp('timestamp');
            $table->string('method', 30);
            $table->json('compliance_snapshot');
            $table->text('override_reason')->nullable();
            $table->uuid('override_by_user_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('worker_id')->references('id')->on('workspace_members')->onDelete('cascade');
            $table->foreign('override_by_user_id')->references('id')->on('users')->onDelete('set null');
            $table->index('workspace_id');
            $table->index('worker_id');
            $table->index('direction');
            $table->index('timestamp');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_access_logs');
    }
};
