<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_plan_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('shift_plan_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('worker_id')->constrained('workspace_members')->cascadeOnDelete();
            $table->string('role', 100);
            $table->string('status', 20)->default('assigned');
            $table->timestampTz('checked_in_at')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->unique(['shift_plan_id', 'worker_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_plan_assignments');
    }
};
