<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('leave_requests')) {
            Schema::create('leave_requests', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('workspace_id');
                $table->uuid('user_id');
                $table->string('type', 50);
                $table->date('start_date');
                $table->date('end_date');
                $table->text('reason')->nullable();
                $table->string('status', 30)->default('pending');
                $table->uuid('approved_by')->nullable();
                $table->timestampTz('approved_at')->nullable();
                $table->text('decline_reason')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();
                $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
                $table->index(['workspace_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
    }
};
