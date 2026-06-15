<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared('
            CREATE OR REPLACE FUNCTION update_realtime_events_sequence()
            RETURNS TRIGGER LANGUAGE plpgsql AS $$
            BEGIN
                NEW.sequence = (
                    SELECT COALESCE(MAX(sequence), 0) + 1
                    FROM realtime_events
                );
                RETURN NEW;
            END;
            $$;

            DROP TRIGGER IF EXISTS trg_realtime_events_sequence ON realtime_events;

            CREATE TRIGGER trg_realtime_events_sequence
            BEFORE INSERT ON realtime_events
            FOR EACH ROW
            EXECUTE FUNCTION update_realtime_events_sequence();
        ');
    }

    public function down(): void
    {
        DB::unprepared('
            DROP TRIGGER IF EXISTS trg_realtime_events_sequence ON realtime_events;
            DROP FUNCTION IF EXISTS update_realtime_events_sequence();
        ');
    }
};
