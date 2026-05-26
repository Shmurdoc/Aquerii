<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('parent_id')->nullable();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('color', 7)->nullable();
            $table->integer('position')->default(0);
            $table->uuid('created_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->index('workspace_id');
        });

        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('category_id')->nullable();
            $table->string('name', 255);
            $table->string('sku', 100)->nullable();
            $table->string('barcode', 100)->nullable();
            $table->text('description')->nullable();
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->string('unit', 50)->default('pc');
            $table->string('currency', 3)->default('USD');
            $table->string('image_path', 512)->nullable();
            $table->jsonb('attributes')->nullable();
            $table->uuid('created_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('category_id')->references('id')->on('inventory_categories')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['workspace_id', 'sku']);
            $table->index('workspace_id');
        });

        Schema::create('stock_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('product_id');
            $table->string('lot_number', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->integer('quantity')->default(0);
            $table->string('location', 255)->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('status', 20)->default('in_stock');
            $table->uuid('created_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->index('workspace_id');
            $table->index('status');
        });

        Schema::table('inventory_categories', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('inventory_categories')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_items');
        Schema::dropIfExists('products');
        Schema::dropIfExists('inventory_categories');
    }
};
