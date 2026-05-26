<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // G19 — Missing indexes on FK columns (PostgreSQL does not auto-index FKs)
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->index('purchase_order_id');
        });
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->index('sales_order_id');
        });
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->index('account_id');
        });
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->index('invoice_id');
        });

        // G20 — Non-timezone-aware timestamps
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropTimestamps();
            $table->dropSoftDeletes();
        });
        Schema::table('invoices', function (Blueprint $table) {
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropTimestamps();
        });
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->timestampsTz();
        });

        Schema::table('accounts', function (Blueprint $table) {
            $table->dropTimestamps();
            $table->dropSoftDeletes();
        });
        Schema::table('accounts', function (Blueprint $table) {
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropTimestamps();
        });
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->dropIndex(['purchase_order_id']);
        });
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->dropIndex(['sales_order_id']);
        });
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropIndex(['account_id']);
        });
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropIndex(['invoice_id']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropTimestampsTz();
            $table->dropSoftDeletesTz();
        });
        Schema::table('invoices', function (Blueprint $table) {
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropTimestampsTz();
        });
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->timestamps();
        });

        Schema::table('accounts', function (Blueprint $table) {
            $table->dropTimestampsTz();
            $table->dropSoftDeletesTz();
        });
        Schema::table('accounts', function (Blueprint $table) {
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropTimestampsTz();
        });
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->timestamps();
        });
    }
};
