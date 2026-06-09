<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_quotes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('quote_number')->unique();
            $table->uuid('deal_id')->nullable();
            $table->uuid('contact_id')->nullable();
            $table->uuid('company_id')->nullable();
            $table->string('status')->default('draft');
            $table->jsonb('line_items');
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('discount', 14, 2)->default(0);
            $table->decimal('tax', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->text('notes')->nullable();
            $table->text('terms')->nullable();
            $table->timestampTz('valid_until')->nullable();
            $table->timestampTz('sent_at')->nullable();
            $table->timestampTz('accepted_at')->nullable();
            $table->timestampTz('rejected_at')->nullable();
            $table->string('rejection_reason')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        DB::statement('CREATE INDEX idx_crm_quote_workspace ON crm_quotes (workspace_id)');
        DB::statement('CREATE INDEX idx_crm_quote_deal ON crm_quotes (deal_id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_quotes');
    }
};
