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
            $table->uuid('workspace_id');
            $table->uuid('kiosk_id')->nullable();

            $table->string('visitor_type', 20);
            $table->string('full_name', 255);
            $table->string('company', 255);
            $table->string('id_number', 100)->nullable();
            $table->string('vehicle_reg', 50)->nullable();

            $table->string('host_name', 255);
            $table->string('host_contact', 50)->nullable();
            $table->uuid('host_user_id')->nullable();
            $table->boolean('host_notified')->default(false);
            $table->timestampTz('host_notified_at')->nullable();

            $table->text('purpose');

            $table->timestampTz('signed_in_at')->useCurrent();
            $table->timestampTz('signed_out_at')->nullable();

            $table->boolean('badge_printed')->default(false);
            $table->timestampTz('badge_printed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('kiosk_id')->references('id')->on('gate_kiosks')->onDelete('set null');
            $table->foreign('host_user_id')->references('id')->on('users')->onDelete('set null');

            $table->index(['workspace_id', 'signed_in_at', 'signed_out_at']);
            $table->index(['kiosk_id', 'signed_out_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_logs');
    }
};
