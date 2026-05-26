<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('code', 20);
            $table->string('name', 255);
            $table->string('type', 20);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['workspace_id', 'code']);
            $table->index('type');
        });

        Schema::create('journal_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('account_id');
            $table->date('entry_date');
            $table->string('description', 500);
            $table->decimal('debit_amount', 14, 2)->default(0);
            $table->decimal('credit_amount', 14, 2)->default(0);
            $table->string('reference_type', 50)->nullable();
            $table->uuid('reference_id')->nullable();
            $table->uuid('created_by');
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->index('entry_date');
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('accounts');
    }
};
