<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_plans', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('shift_type', 20);
            $table->json('required_roles');
            $table->string('status', 20)->default('draft');
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->unique(['workspace_id', 'date', 'shift_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_plans');
    }
};
