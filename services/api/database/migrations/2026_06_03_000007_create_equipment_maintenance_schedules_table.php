<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_maintenance_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('equipment_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('frequency_type', 20); // hours, days, weeks, months
            $table->integer('frequency_value');
            $table->string('trigger_type', 20)->default('calendar'); // meter, calendar
            $table->timestampTz('last_performed_at')->nullable();
            $table->timestampTz('next_due_at')->nullable();
            $table->integer('last_meter_reading')->nullable();
            $table->foreignUuid('template_id')->nullable()->constrained('job_card_templates')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_maintenance_schedules');
    }
};
