<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_handovers', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('from_assignment_id')->nullable()->constrained('shift_assignments')->nullOnDelete();
            $table->foreignUuid('to_assignment_id')->nullable()->constrained('shift_assignments')->nullOnDelete();
            $table->foreignUuid('departing_user_id')->constrained('users');
            $table->foreignUuid('incoming_user_id')->nullable()->constrained('users');
            $table->text('departing_notes');
            $table->text('incoming_notes')->nullable();
            $table->timestampTz('departing_signed_at')->nullable();
            $table->timestampTz('incoming_acknowledged_at')->nullable();
            $table->string('status', 30)->default('pending');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_handovers');
    }
};
