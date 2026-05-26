<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // sales_orders already has 'status' (string 30, default 'draft') from create migration.
        // Add the workflow FK and timestamp columns only.
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->uuid('converted_to_invoice_id')->nullable()->after('status');
            $table->timestampTz('converted_at')->nullable()->after('converted_to_invoice_id');
            $table->uuid('approved_by')->nullable()->after('converted_at');
            $table->timestampTz('approved_at')->nullable()->after('approved_by');

            // Defer FK — invoices table exists (created earlier in migration order)
            $table->foreign('converted_to_invoice_id')
                ->references('id')
                ->on('invoices')
                ->nullOnDelete();
        });

        // invoices already has 'status' (string 20, default 'draft') and 'due_date' and 'paid_at'.
        // Add source SO link, sent_at, amount_paid.
        Schema::table('invoices', function (Blueprint $table) {
            $table->uuid('source_sales_order_id')->nullable()->after('status');
            $table->timestampTz('sent_at')->nullable()->after('paid_at');
            $table->decimal('amount_paid', 15, 2)->default(0)->after('sent_at');

            $table->foreign('source_sales_order_id')
                ->references('id')
                ->on('sales_orders')
                ->nullOnDelete();

            $table->index('source_sales_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['source_sales_order_id']);
            $table->dropIndex(['source_sales_order_id']);
            $table->dropColumn(['source_sales_order_id', 'sent_at', 'amount_paid']);
        });

        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropForeign(['converted_to_invoice_id']);
            $table->dropColumn(['converted_to_invoice_id', 'converted_at', 'approved_by', 'approved_at']);
        });
    }
};
