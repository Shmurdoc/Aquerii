<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('boards', function (Blueprint $table) {
            // JSONB column to persist Excalidraw canvas state
            // (elements, appState subset, files map)
            $table->jsonb('excalidraw_state')->nullable()->after('settings');
        });
    }

    public function down(): void
    {
        Schema::table('boards', function (Blueprint $table) {
            $table->dropColumn('excalidraw_state');
        });
    }
};
