<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('journal_entries')) {
            return;
        }

        Schema::create('journal_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('account_id')->nullable();
            $table->date('entry_date');
            $table->string('description')->nullable();
            $table->decimal('debit_amount', 15, 2)->default(0);
            $table->decimal('credit_amount', 15, 2)->default(0);
            $table->string('reference_type')->nullable();
            $table->string('reference_id')->nullable();
            $table->uuid('created_by')->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamp('posted_at')->nullable();
            $table->uuid('posted_by')->nullable();
            $table->uuid('reversal_of')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->index('workspace_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
    }
};
