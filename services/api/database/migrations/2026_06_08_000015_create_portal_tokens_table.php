<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portal_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('label');
            $table->string('token_hash', 64);
            $table->timestampTz('expires_at');
            $table->timestampTz('created_at')->useCurrent();

            $table->index('token_hash');
            $table->index('workspace_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_tokens');
    }
};
