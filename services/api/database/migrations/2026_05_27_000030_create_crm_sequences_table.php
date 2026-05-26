<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_sequences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->jsonb('steps')->default('[]');
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->index('workspace_id');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_sequences');
    }
};
