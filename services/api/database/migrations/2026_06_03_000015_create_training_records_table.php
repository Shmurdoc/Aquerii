<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_records', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('competency_type_id')->nullable()->constrained()->nullOnDelete();
            $table->string('training_name');
            $table->string('provider')->nullable();
            $table->date('date_completed');
            $table->date('expiry_date')->nullable();
            $table->string('result')->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->text('notes')->nullable();
            $table->text('document_url')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->index(['user_id', 'date_completed']);
            $table->index(['expiry_date', 'result']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_records');
    }
};
