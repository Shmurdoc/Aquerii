<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_campaign_audiences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('campaign_id');
            $table->uuid('contact_id');
            $table->string('status')->default('queued');
            $table->timestampTz('sent_at')->nullable();
            $table->timestampTz('opened_at')->nullable();
            $table->timestampTz('clicked_at')->nullable();
            $table->timestampTz('converted_at')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement('CREATE INDEX idx_mkt_campaign_audience_campaign ON marketing_campaign_audiences (campaign_id)');
        DB::statement('CREATE INDEX idx_mkt_campaign_audience_contact ON marketing_campaign_audiences (contact_id)');
        DB::statement('CREATE UNIQUE INDEX idx_mkt_campaign_audience_unique ON marketing_campaign_audiences (campaign_id, contact_id) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_campaign_audiences');
    }
};
