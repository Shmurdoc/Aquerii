<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_cert_records', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id');
            $table->uuid('equipment_id');
            $table->uuid('cert_type_id');
            $table->string('cert_number', 255);
            $table->timestampTz('issued_at')->nullable();
            $table->timestampTz('expires_at')->nullable();
            $table->string('status', 20)->default('valid');
            $table->boolean('verified')->default(false);
            $table->timestampTz('verified_at')->nullable();
            $table->uuid('verified_by')->nullable();
            $table->text('file_url')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();
            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('cert_type_id')->references('id')->on('equipment_cert_types')->cascadeOnDelete();
            $table->foreign('verified_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['workspace_id', 'equipment_id']);
            $table->index(['workspace_id', 'cert_type_id']);
            $table->index(['workspace_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_cert_records');
    }
};
