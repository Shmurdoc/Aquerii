<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('invoices')) {
            return;
        }

        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('invoice_number');
            $table->string('status')->default('draft');
            $table->string('currency', 3)->default('USD');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_total', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->uuid('customer_id')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('customer_email')->nullable();
            $table->text('billing_address')->nullable();
            $table->uuid('crm_deal_id')->nullable();
            $table->uuid('work_order_id')->nullable();
            $table->uuid('milestone_id')->nullable();
            $table->date('issue_date')->nullable();
            $table->date('due_date')->nullable();
            $table->timestampTz('paid_at')->nullable();
            $table->timestampTz('posted_at')->nullable();
            $table->timestampTz('reversed_at')->nullable();
            $table->string('reversal_reason')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->index('workspace_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
