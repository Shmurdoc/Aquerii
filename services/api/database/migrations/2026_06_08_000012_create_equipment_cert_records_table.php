<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_cert_records', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('equipment_id')->constrained('equipment')->cascadeOnDelete();
            $table->foreignUuid('equipment_cert_type_id')->constrained('equipment_cert_types')->cascadeOnDelete();
            $table->string('cert_number')->nullable();
            $table->date('issued_at');
            $table->date('expires_at')->nullable();
            $table->timestampTz('verified_at')->nullable();
            $table->string('verified_by')->nullable();
            $table->string('file_path')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('pending');
            $table->json('metadata')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->index(['equipment_id', 'equipment_cert_type_id']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_cert_records');
    }
};
