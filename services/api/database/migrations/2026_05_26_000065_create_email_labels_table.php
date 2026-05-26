<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_labels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name');
            $table->string('color')->default('#6366f1');
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->unique(['workspace_id', 'name']);
        });

        Schema::create('email_thread_labels', function (Blueprint $table) {
            $table->uuid('thread_id');
            $table->uuid('label_id');
            $table->primary(['thread_id', 'label_id']);

            $table->foreign('thread_id')->references('id')->on('email_threads')->cascadeOnDelete();
            $table->foreign('label_id')->references('id')->on('email_labels')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_thread_labels');
        Schema::dropIfExists('email_labels');
    }
};
