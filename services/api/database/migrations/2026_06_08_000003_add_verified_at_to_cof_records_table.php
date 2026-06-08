<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cof_records', function (Blueprint $table) {
            $table->timestampTz('verified_at')->nullable()->after('expires_at');
            $table->index(['verified_at', 'expires_at', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('cof_records', function (Blueprint $table) {
            $table->dropIndex(['verified_at', 'expires_at', 'status']);
            $table->dropColumn('verified_at');
        });
    }
};
