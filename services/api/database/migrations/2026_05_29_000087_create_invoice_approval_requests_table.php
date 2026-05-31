<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_approval_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('invoice_id');
            $table->string('status', 30)->default('pending'); // pending|approved|rejected
            $table->uuid('requested_by');
            $table->uuid('approver_user_id')->nullable();
            $table->timestampTz('requested_at')->nullable();
            $table->timestampTz('resolved_at')->nullable();
            $table->text('decision_note')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
            $table->foreign('requested_by')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('approver_user_id')->references('id')->on('users')->nullOnDelete();

            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'invoice_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_approval_requests');
    }
};
