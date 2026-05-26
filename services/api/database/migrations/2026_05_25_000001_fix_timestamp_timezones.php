<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // M-1: Convert won_at and lost_at on crm_deals to TIMESTAMPTZ
        DB::statement('ALTER TABLE crm_deals ALTER COLUMN won_at TYPE TIMESTAMPTZ USING won_at AT TIME ZONE \'UTC\'');
        DB::statement('ALTER TABLE crm_deals ALTER COLUMN lost_at TYPE TIMESTAMPTZ USING lost_at AT TIME ZONE \'UTC\'');

        // M-2: Convert paid_at on invoices to TIMESTAMPTZ
        DB::statement('ALTER TABLE invoices ALTER COLUMN paid_at TYPE TIMESTAMPTZ USING paid_at AT TIME ZONE \'UTC\'');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE crm_deals ALTER COLUMN won_at TYPE TIMESTAMP USING won_at AT TIME ZONE \'UTC\'');
        DB::statement('ALTER TABLE crm_deals ALTER COLUMN lost_at TYPE TIMESTAMP USING lost_at AT TIME ZONE \'UTC\'');
        DB::statement('ALTER TABLE invoices ALTER COLUMN paid_at TYPE TIMESTAMP USING paid_at AT TIME ZONE \'UTC\'');
    }
};
