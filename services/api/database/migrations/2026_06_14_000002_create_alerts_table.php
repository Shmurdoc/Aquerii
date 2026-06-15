<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id');
            $table->uuid('user_id');
            $table->uuid('assigned_to')->nullable();
            $table->string('type', 50);
            $table->string('severity', 20);
            $table->string('title');
            $table->text('message')->nullable();
            $table->timestampTz('acknowledged_at')->nullable();
            $table->timestampsTz();
            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['workspace_id', 'acknowledged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
