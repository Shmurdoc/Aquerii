<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('competency_requirements', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('requirable_type');
            $table->uuid('requirable_id');
            $table->foreignUuid('competency_type_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_mandatory')->default(true);
            $table->unsignedInteger('expiry_alert_days')->default(30);
            $table->text('notes')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->unique(['requirable_type', 'requirable_id', 'competency_type_id'], 'requirement_unique');
            $table->index(['requirable_type', 'requirable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competency_requirements');
    }
};
