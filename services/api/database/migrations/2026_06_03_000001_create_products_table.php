<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            return;
        }

        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('category_id')->nullable();
            $table->string('name');
            $table->string('sku')->nullable()->index();
            $table->text('description')->nullable();
            $table->decimal('unit_price', 15, 2)->nullable();
            $table->string('unit')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->index('workspace_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
