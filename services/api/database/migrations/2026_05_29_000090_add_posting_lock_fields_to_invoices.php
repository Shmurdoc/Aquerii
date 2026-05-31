<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('invoices', 'posted_at')) {
                $table->timestampTz('posted_at')->nullable()->after('paid_at');
            }
            if (! Schema::hasColumn('invoices', 'reversed_at')) {
                $table->timestampTz('reversed_at')->nullable()->after('posted_at');
            }
            if (! Schema::hasColumn('invoices', 'reversal_reason')) {
                $table->text('reversal_reason')->nullable()->after('reversed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (Schema::hasColumn('invoices', 'reversal_reason')) {
                $table->dropColumn('reversal_reason');
            }
            if (Schema::hasColumn('invoices', 'reversed_at')) {
                $table->dropColumn('reversed_at');
            }
            if (Schema::hasColumn('invoices', 'posted_at')) {
                $table->dropColumn('posted_at');
            }
        });
    }
};
