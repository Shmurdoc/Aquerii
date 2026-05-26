<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('attendance_logs')) {
            Schema::create('attendance_logs', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('workspace_id');
                $table->uuid('user_id');
                $table->timestampTz('clocked_in_at');
                $table->timestampTz('clocked_out_at')->nullable();
                $table->string('status', 30)->default('present');
                $table->text('notes')->nullable();
                $table->timestampsTz();
                $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->index(['workspace_id', 'clocked_in_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
    }
};
