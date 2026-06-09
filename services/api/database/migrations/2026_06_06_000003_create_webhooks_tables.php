<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_endpoints', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->text('url'); // https-only, validated at app layer
            $table->string('secret', 64); // 32 random bytes, base64-encoded
            $table->jsonb('events')->default('[]'); // array of subscribed event names
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->timestampTz('last_triggered_at')->nullable();
            $table->integer('last_response_status')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['workspace_id', 'is_active']);
        });

        Schema::create('webhook_deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('webhook_endpoint_id')->constrained('webhook_endpoints')->cascadeOnDelete();
            $table->string('event', 120);
            $table->jsonb('payload');
            $table->integer('response_status')->nullable();
            $table->text('response_body')->nullable(); // truncated to 4KB at app layer
            $table->integer('attempt')->default(1);
            $table->timestampTz('delivered_at')->nullable();
            $table->timestampTz('failed_at')->nullable();
            $table->timestampsTz();

            $table->index(['webhook_endpoint_id', 'created_at'], 'wh_deliveries_endpoint_created_idx');
        });

        // Partial index on undelivered rows for retry-queue scans.
        // Laravel's Blueprint doesn't support partial indexes natively, so use raw SQL.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX webhook_deliveries_undelivered_idx ON webhook_deliveries (created_at) WHERE delivered_at IS NULL');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS webhook_deliveries_undelivered_idx');
        }
        Schema::dropIfExists('webhook_deliveries');
        Schema::dropIfExists('webhook_endpoints');
    }
};
