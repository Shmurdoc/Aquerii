<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('expense_claims')) {
            Schema::create('expense_claims', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('workspace_id');
                $table->uuid('user_id');
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('category', 50)->default('other');
                $table->decimal('amount', 15, 2);
                $table->string('currency', 3)->default('USD');
                $table->date('expense_date');
                $table->string('status', 30)->default('pending');
                $table->uuid('approved_by')->nullable();
                $table->timestampTz('approved_at')->nullable();
                $table->string('receipt_path')->nullable();
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
        Schema::dropIfExists('expense_claims');
    }
};
