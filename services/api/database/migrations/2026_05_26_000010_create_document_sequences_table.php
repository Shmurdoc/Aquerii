<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_sequences', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id');
            $table->string('document_type', 50);
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('last_number')->default(0);
            $table->timestamps();
            $table->unique(['workspace_id', 'document_type', 'year']);
            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_sequences');
    }
};
