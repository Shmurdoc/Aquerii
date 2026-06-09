<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->string('status', 20)->default('draft')->after('credit_amount');
            $table->timestamp('posted_at')->nullable()->after('status');
            $table->uuid('posted_by')->nullable()->after('posted_at');
            $table->uuid('reversal_of')->nullable()->after('posted_by');
            $table->index('status');
            $table->foreign('posted_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('reversal_of')->references('id')->on('journal_entries')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropForeign(['posted_by']);
            $table->dropForeign(['reversal_of']);
            $table->dropColumn(['status', 'posted_at', 'posted_by', 'reversal_of']);
        });
    }
};
