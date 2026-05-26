<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_invitations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('email');
            $table->string('role')->default('member');
            $table->uuid('token')->unique();
            $table->string('invited_by')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['workspace_id', 'email']);
            $table->index('token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_invitations');
    }
};
