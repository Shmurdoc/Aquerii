<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_sequence_enrollments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('sequence_id');
            $table->uuid('contact_id');
            $table->uuid('deal_id')->nullable();
            $table->integer('current_step')->default(0);
            $table->string('status', 30)->default('active');
            $table->timestampTz('entered_at');
            $table->timestampTz('completed_at')->nullable();
            $table->timestampsTz();

            $table->unique(['sequence_id', 'contact_id']);
            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('sequence_id')->references('id')->on('crm_sequences')->cascadeOnDelete();
            $table->foreign('contact_id')->references('id')->on('crm_contacts')->cascadeOnDelete();
            $table->foreign('deal_id')->references('id')->on('crm_deals')->nullOnDelete();
            $table->index('workspace_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_sequence_enrollments');
    }
};
