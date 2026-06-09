<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_usage', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('resource', 50);
            $table->bigInteger('used')->default(0);
            $table->timestamp('updated_at')->useCurrent();

            $table->unique(['workspace_id', 'resource']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_usage');
    }
};
