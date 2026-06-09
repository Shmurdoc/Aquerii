<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_sla_breaches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('ticket_id');
            $table->uuid('sla_policy_id')->nullable();
            $table->string('breach_type', 50);
            $table->timestampTz('breached_at');
            $table->uuid('escalated_to')->nullable();
            $table->timestampTz('escalated_at')->nullable();
            $table->timestampTz('resolved_at')->nullable();
            $table->timestampsTz();

            $table->foreign('ticket_id')->references('id')->on('support_tickets')->cascadeOnDelete();
            $table->foreign('sla_policy_id')->references('id')->on('support_ticket_slas')->nullOnDelete();
            $table->foreign('escalated_to')->references('id')->on('users')->nullOnDelete();
            $table->index('ticket_id');
            $table->index('breach_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_sla_breaches');
    }
};
