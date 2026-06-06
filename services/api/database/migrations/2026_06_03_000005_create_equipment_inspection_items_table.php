<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_inspection_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('inspection_id')->constrained('equipment_inspections')->cascadeOnDelete();
            $table->string('item_name');
            $table->boolean('passed');
            $table->text('notes')->nullable();
            $table->integer('position')->default(0);
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_inspection_items');
    }
};
