<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('competency_types', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category')->default('certification');
            $table->string('issuing_body')->nullable();
            $table->boolean('is_cof')->default(false);
            $table->boolean('requires_renewal')->default(false);
            $table->unsignedInteger('renewal_period_days')->nullable();
            $table->string('color')->nullable();
            $table->string('icon')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->unique(['workspace_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competency_types');
    }
};
