<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitor_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('kiosk_id')->nullable();
            $table->string('visitor_type');
            $table->string('full_name');
            $table->string('company');
            $table->string('id_number')->nullable();
            $table->string('vehicle_reg')->nullable();
            $table->string('host_name');
            $table->string('host_contact')->nullable();
            $table->foreignUuid('host_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('host_notified')->default(false);
            $table->timestampTz('host_notified_at')->nullable();
            $table->text('purpose');
            $table->timestampTz('signed_in_at')->useCurrent();
            $table->timestampTz('signed_out_at')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->boolean('badge_printed')->default(false);
            $table->timestampTz('badge_printed_at')->nullable();
            $table->timestamps();
            $table->index('workspace_id');
            $table->index(['signed_out_at', 'signed_in_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_logs');
    }
};
