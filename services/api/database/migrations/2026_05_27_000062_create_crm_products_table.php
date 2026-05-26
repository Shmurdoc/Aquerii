<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('sku')->nullable();
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->string('category')->nullable();
            $table->jsonb('attributes')->nullable();
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement('CREATE INDEX idx_crm_prod_workspace ON crm_products (workspace_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_products');
    }
};
