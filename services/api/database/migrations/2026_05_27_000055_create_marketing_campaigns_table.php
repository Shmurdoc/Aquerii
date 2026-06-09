<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('type')->default('email');
            $table->string('status')->default('draft');
            $table->string('channel')->nullable();
            $table->decimal('budget', 12, 2)->nullable();
            $table->decimal('actual_spend', 12, 2)->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('ended_at')->nullable();
            $table->jsonb('target_audience')->nullable();
            $table->text('goal')->nullable();
            $table->jsonb('tags')->nullable();
            $table->jsonb('metadata')->nullable();

            $table->integer('sent_count')->default(0);
            $table->integer('opened_count')->default(0);
            $table->integer('clicked_count')->default(0);
            $table->integer('converted_count')->default(0);

            $table->uuid('launched_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement('CREATE INDEX idx_mkt_campaigns_workspace ON marketing_campaigns (workspace_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_campaigns');
    }
};
