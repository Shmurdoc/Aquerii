<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('billing_events', function (Blueprint $table) {
            if (!Schema::hasColumn('billing_events', 'amount_cents')) {
                $table->unsignedBigInteger('amount_cents')->default(0)->after('payload');
            }
            if (!Schema::hasColumn('billing_events', 'currency')) {
                $table->char('currency', 3)->default('USD')->after('amount_cents');
            }
        });
    }

    public function down(): void
    {
        Schema::table('billing_events', function (Blueprint $table) {
            $table->dropColumn(['amount_cents', 'currency']);
        });
    }
};
