<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('deal_id');
            $table->uuid('contact_id')->nullable();
            $table->string('type', 20)->default('note'); // call, email, note, meeting
            $table->string('subject', 255)->nullable();
            $table->text('description')->nullable();
            $table->timestampTz('activity_date')->nullable();
            $table->uuid('created_by');
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('deal_id')->references('id')->on('crm_deals')->cascadeOnDelete();
            $table->foreign('contact_id')->references('id')->on('crm_contacts')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users');

            $table->index(['deal_id', 'activity_date']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_activities');
    }
};
