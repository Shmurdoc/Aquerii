<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->string('registration_number')->nullable()->unique()->after('plant_number');
            $table->string('equipment_type')->nullable()->after('registration_number');
            $table->string('manufacturer')->nullable()->after('make');
            $table->string('site_area')->nullable()->after('location');
            $table->string('compliance_status', 30)->default('compliant')->after('status');
            $table->timestampTz('last_compliance_check_at')->nullable()->after('compliance_status');
        });
    }

    public function down(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->dropColumn([
                'registration_number',
                'equipment_type',
                'manufacturer',
                'site_area',
                'compliance_status',
                'last_compliance_check_at',
            ]);
        });
    }
};
