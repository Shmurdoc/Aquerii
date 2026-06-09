<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_email_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('subject');
            $table->longText('content_html')->nullable();
            $table->longText('content_text')->nullable();
            $table->jsonb('tokens')->nullable();
            $table->string('category')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->boolean('is_shared')->default(false);
            $table->uuid('created_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement('CREATE INDEX idx_mkt_templates_workspace ON marketing_email_templates (workspace_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_email_templates');
    }
};
