<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('assigned_to')->nullable();
            $table->uuid('client_id')->nullable();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('status', 30)->default('new');
            $table->string('priority', 20)->default('medium');
            $table->string('industry_template', 100)->nullable();
            $table->string('location', 255)->nullable();
            $table->json('custom_fields')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('signed_off_at')->nullable();
            $table->uuid('signed_off_by')->nullable();
            $table->text('signoff_notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->uuid('created_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('signed_off_by')->references('id')->on('users')->nullOnDelete();
            $table->index('status');
            $table->index('priority');
            $table->index(['workspace_id', 'status']);
        });

        Schema::create('job_card_tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('job_card_id');
            $table->string('description', 500);
            $table->boolean('is_checked')->default(false);
            $table->integer('position')->default(0);
            $table->string('category', 50)->default('general');
            $table->uuid('completed_by')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('job_card_id')->references('id')->on('job_cards')->onDelete('cascade');
            $table->foreign('completed_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('job_card_time_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('job_card_id');
            $table->uuid('user_id');
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('job_card_id')->references('id')->on('job_cards')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('job_card_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('job_card_id');
            $table->string('filename', 255);
            $table->string('filepath', 500);
            $table->string('mime_type', 100)->nullable();
            $table->integer('file_size')->nullable();
            $table->string('category', 50)->default('photo');
            $table->uuid('uploaded_by');
            $table->timestamps();

            $table->foreign('job_card_id')->references('id')->on('job_cards')->onDelete('cascade');
            $table->foreign('uploaded_by')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('job_card_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id')->nullable();
            $table->string('name', 255);
            $table->string('industry', 100)->nullable();
            $table->text('description')->nullable();
            $table->json('default_tasks')->nullable();
            $table->json('default_fields')->nullable();
            $table->json('safety_checklist')->nullable();
            $table->boolean('is_global')->default(false);
            $table->uuid('created_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_card_templates');
        Schema::dropIfExists('job_card_attachments');
        Schema::dropIfExists('job_card_time_entries');
        Schema::dropIfExists('job_card_tasks');
        Schema::dropIfExists('job_cards');
    }
};
