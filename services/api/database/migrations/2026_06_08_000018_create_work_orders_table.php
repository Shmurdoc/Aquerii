<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('crm_deal_id');
            $table->string('work_order_number', 50);
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('draft');
            $table->text('scope_of_work')->nullable();
            $table->string('location', 255)->nullable();
            $table->date('scheduled_start')->nullable();
            $table->date('scheduled_end')->nullable();
            $table->dateTime('actual_start')->nullable();
            $table->dateTime('actual_end')->nullable();
            $table->uuid('assigned_worker_id')->nullable();
            $table->decimal('total_hours_estimated', 8, 2)->nullable();
            $table->decimal('total_hours_actual', 8, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('crm_deal_id')->references('id')->on('crm_deals')->onDelete('cascade');
            $table->foreign('assigned_worker_id')->references('id')->on('users')->onDelete('set null');
            $table->unique(['workspace_id', 'work_order_number']);
            $table->index('status');
            $table->index(['crm_deal_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_orders');
    }
};
