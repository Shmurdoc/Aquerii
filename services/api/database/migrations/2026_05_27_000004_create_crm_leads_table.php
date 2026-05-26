<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('contact_id')->nullable();
            $table->string('email', 255)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('company_name', 150)->nullable();
            $table->string('source', 50)->default('manual');
            $table->text('source_url')->nullable();
            $table->integer('score')->default(0);
            $table->string('status', 30)->default('new');
            $table->uuid('assigned_to')->nullable();
            $table->text('notes')->nullable();
            $table->jsonb('custom_fields')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('contact_id')->references('id')->on('crm_contacts')->nullOnDelete();
            $table->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
            $table->index('workspace_id');
            $table->index('status');
            $table->index('assigned_to');
            $table->index('score');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_leads');
    }
};
