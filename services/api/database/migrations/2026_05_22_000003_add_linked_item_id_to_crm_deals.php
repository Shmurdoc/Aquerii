<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_deals', function (Blueprint $table) {
            $table->uuid('linked_item_id')->nullable()->after('company_id');
            $table->foreign('linked_item_id')->references('id')->on('items')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('crm_deals', function (Blueprint $table) {
            $table->dropForeign(['linked_item_id']);
            $table->dropColumn('linked_item_id');
        });
    }
};
