<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('order_number', 50);
            $table->string('supplier_id', 255)->nullable();
            $table->string('supplier_name', 255);
            $table->string('supplier_email', 255)->nullable();
            $table->string('status', 30)->default('draft');
            $table->string('currency', 3)->default('USD');
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('tax_total', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->date('order_date')->nullable();
            $table->date('expected_date')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by');
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['workspace_id', 'order_number']);
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('purchase_order_id');
            $table->string('product_id', 255)->nullable();
            $table->string('description', 500);
            $table->decimal('quantity', 12, 2)->default(1);
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
    }
};
