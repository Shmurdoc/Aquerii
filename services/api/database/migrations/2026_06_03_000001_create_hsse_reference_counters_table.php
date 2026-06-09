<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hsse_reference_counters', function (Blueprint $table) {
            $table->uuid('workspace_id');
            $table->string('entity', 50);
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('last_value')->default(0);
            $table->timestamps();

            $table->primary(['workspace_id', 'entity', 'year']);
            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
        });

        DB::statement(
            'CREATE UNIQUE INDEX hsse_reference_counters_unique ON hsse_reference_counters (workspace_id, entity, year)'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('hsse_reference_counters');
    }
};
