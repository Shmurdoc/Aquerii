<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->uuid('crm_deal_id')->nullable()->after('customer_id');
            $table->uuid('work_order_id')->nullable()->after('crm_deal_id');
            $table->uuid('milestone_id')->nullable()->after('work_order_id');

            $table->foreign('crm_deal_id')->references('id')->on('crm_deals')->onDelete('set null');
            $table->foreign('work_order_id')->references('id')->on('work_orders')->onDelete('set null');
            $table->foreign('milestone_id')->references('id')->on('contract_milestones')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['crm_deal_id']);
            $table->dropForeign(['work_order_id']);
            $table->dropForeign(['milestone_id']);
            $table->dropColumn(['crm_deal_id', 'work_order_id', 'milestone_id']);
        });
    }
};
