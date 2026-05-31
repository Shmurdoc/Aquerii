<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delegations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('item_id');
            $table->uuid('from_user_id');
            $table->uuid('to_user_id');
            $table->string('reason', 500);
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamp('delegated_at');
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->uuid('accepted_by')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('item_id')->references('id')->on('items')->onDelete('cascade');
            $table->foreign('from_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('to_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('status');
            $table->index(['workspace_id', 'status']);
            $table->index(['to_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delegations');
    }
};
