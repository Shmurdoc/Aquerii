<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_ticket_slas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('priority', 20);
            $table->integer('first_response_hours');
            $table->integer('resolution_hours');
            $table->uuid('escalation_user_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('escalation_user_id')->references('id')->on('users')->nullOnDelete();
            $table->index('workspace_id');
            $table->index('priority');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_ticket_slas');
    }
};
