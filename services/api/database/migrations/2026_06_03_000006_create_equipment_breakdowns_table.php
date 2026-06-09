<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_breakdowns', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('equipment_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('job_card_id')->nullable()->constrained('job_cards')->nullOnDelete();
            $table->text('description');
            $table->text('root_cause')->nullable();
            $table->text('action_taken')->nullable();
            $table->integer('downtime_minutes')->nullable();
            $table->string('status', 30)->default('reported');
            $table->timestampTz('reported_at');
            $table->timestampTz('resolved_at')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_breakdowns');
    }
};
