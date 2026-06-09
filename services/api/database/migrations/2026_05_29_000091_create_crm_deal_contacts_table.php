<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_deal_contacts', function (Blueprint $table) {
            $table->uuid('contact_id');
            $table->uuid('deal_id');
            $table->timestampsTz();

            $table->primary(['contact_id', 'deal_id']);
            $table->foreign('contact_id')->references('id')->on('crm_contacts')->cascadeOnDelete();
            $table->foreign('deal_id')->references('id')->on('crm_deals')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_deal_contacts');
    }
};
