<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('invoice_number', 50);
            $table->string('status', 20)->default('draft');
            $table->string('currency', 3)->default('USD');
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('tax_total', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->uuid('customer_id')->nullable();
            $table->string('customer_name', 255);
            $table->string('customer_email', 255)->nullable();
            $table->text('billing_address')->nullable();
            $table->date('issue_date');
            $table->date('due_date');
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['workspace_id', 'invoice_number']);
            $table->index('status');
            $table->index('due_date');
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('invoice_id');
            $table->string('description', 500);
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->timestamps();

            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
    }
};
