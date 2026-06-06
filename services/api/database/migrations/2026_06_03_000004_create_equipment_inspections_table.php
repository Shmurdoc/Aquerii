<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_inspections', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('equipment_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('inspected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('shift', 20)->nullable();
            $table->string('status', 30)->default('in_progress');
            $table->text('notes')->nullable();
            $table->timestampTz('inspected_at');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_inspections');
    }
};
