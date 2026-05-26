<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scanned_documents', function (Blueprint $table) {
            $table->jsonb('tags')->nullable()->default('[]')->after('metadata');
        });
    }

    public function down(): void
    {
        Schema::table('scanned_documents', function (Blueprint $table) {
            $table->dropColumn('tags');
        });
    }
};
