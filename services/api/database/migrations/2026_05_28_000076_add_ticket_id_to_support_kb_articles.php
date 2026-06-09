<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_kb_articles', function (Blueprint $table) {
            $table->uuid('ticket_id')->nullable()->after('workspace_id');
            $table->foreign('ticket_id')->references('id')->on('support_tickets')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('support_kb_articles', function (Blueprint $table) {
            $table->dropForeign(['ticket_id']);
            $table->dropColumn('ticket_id');
        });
    }
};
