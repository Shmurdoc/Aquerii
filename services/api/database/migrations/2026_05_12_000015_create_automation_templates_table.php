<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automation_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category', 80)->default('general');  // general | project | crm | billing | hr
            $table->string('trigger_type', 80);
            $table->jsonb('trigger_config')->default('{}');
            $table->jsonb('actions');
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_templates');
    }
};
