<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_payments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('workspace_id');
            $table->uuid('invoice_id');
            $table->decimal('amount', 15, 2);
            $table->string('method', 50)->nullable();   // bank_transfer, cash, card, etc.
            $table->string('reference', 200)->nullable();
            $table->date('payment_date');
            $table->text('notes')->nullable();
            $table->uuid('recorded_by')->nullable();
            $table->timestampsTz();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
            $table->index(['invoice_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_payments');
    }
};
