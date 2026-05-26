<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── reminder_sent_at on items ─────────────────────────────────────
        Schema::table('items', function (Blueprint $table) {
            $table->timestampTz('reminder_sent_at')->nullable()->after('reminder_at');
        });

        // ── realtime_events.sequence auto-increment via sequence + trigger ─
        // PostgreSQL sequence for monotonically increasing per-workspace sequence numbers
        DB::statement('CREATE SEQUENCE IF NOT EXISTS realtime_events_sequence_seq');

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION realtime_events_set_sequence()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.sequence := nextval('realtime_events_sequence_seq');
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        SQL);

        DB::statement(<<<'SQL'
            CREATE TRIGGER trg_realtime_events_sequence
            BEFORE INSERT ON realtime_events
            FOR EACH ROW
            EXECUTE FUNCTION realtime_events_set_sequence();
        SQL);
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('reminder_sent_at');
        });

        DB::statement('DROP TRIGGER IF EXISTS trg_realtime_events_sequence ON realtime_events');
        DB::statement('DROP FUNCTION IF EXISTS realtime_events_set_sequence()');
        DB::statement('DROP SEQUENCE IF EXISTS realtime_events_sequence_seq');
    }
};
