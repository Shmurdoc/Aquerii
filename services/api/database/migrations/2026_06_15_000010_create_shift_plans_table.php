<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_plans', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id');
            $table->date('date');
            $table->string('shift_type'); // day, night, swing, etc.
            $table->string('status')->default('draft'); // draft, published, completed
            $table->jsonb('roles')->default('[]');
            $table->timestampsTz();
            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->index('workspace_id');
            $table->unique(['workspace_id', 'date', 'shift_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_plans');
    }
};
