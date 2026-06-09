<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspace_members', function (Blueprint $table) {
            if (! Schema::hasColumn('workspace_members', 'badge_id')) {
                $table->string('badge_id', 100)->nullable()->unique()->after('invited_email');
            }
            if (! Schema::hasColumn('workspace_members', 'employment_type')) {
                $table->string('employment_type', 50)->nullable()->after('badge_id');
            }
            if (! Schema::hasColumn('workspace_members', 'labour_broker_company')) {
                $table->string('labour_broker_company', 200)->nullable()->after('employment_type');
            }
            if (! Schema::hasColumn('workspace_members', 'union_membership')) {
                $table->string('union_membership', 200)->nullable()->after('labour_broker_company');
            }
            if (! Schema::hasColumn('workspace_members', 'blood_type')) {
                $table->string('blood_type', 10)->nullable()->after('union_membership');
            }
            if (! Schema::hasColumn('workspace_members', 'emergency_contact_name')) {
                $table->string('emergency_contact_name', 200)->nullable()->after('blood_type');
            }
            if (! Schema::hasColumn('workspace_members', 'emergency_contact_phone')) {
                $table->string('emergency_contact_phone', 50)->nullable()->after('emergency_contact_name');
            }
            if (! Schema::hasColumn('workspace_members', 'site_induction_date')) {
                $table->date('site_induction_date')->nullable()->after('emergency_contact_phone');
            }
            if (! Schema::hasColumn('workspace_members', 'site_induction_expiry')) {
                $table->date('site_induction_expiry')->nullable()->after('site_induction_date');
            }
            if (! Schema::hasColumn('workspace_members', 'overall_compliance_status')) {
                $table->string('overall_compliance_status', 50)->nullable()->after('site_induction_expiry');
            }
        });
    }

    public function down(): void
    {
        Schema::table('workspace_members', function (Blueprint $table) {
            $columns = [
                'badge_id', 'employment_type', 'labour_broker_company',
                'union_membership', 'blood_type', 'emergency_contact_name',
                'emergency_contact_phone', 'site_induction_date',
                'site_induction_expiry', 'overall_compliance_status',
            ];
            foreach ($columns as $col) {
                if (Schema::hasColumn('workspace_members', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
