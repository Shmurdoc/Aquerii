<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->decimal('clocked_in_lat', 10, 7)->nullable()->after('clocked_in_at');
            $table->decimal('clocked_in_lng', 10, 7)->nullable()->after('clocked_in_lat');
            $table->decimal('clocked_out_lat', 10, 7)->nullable()->after('clocked_out_at');
            $table->decimal('clocked_out_lng', 10, 7)->nullable()->after('clocked_out_lat');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->dropColumn(['clocked_in_lat', 'clocked_in_lng', 'clocked_out_lat', 'clocked_out_lng']);
        });
    }
};
