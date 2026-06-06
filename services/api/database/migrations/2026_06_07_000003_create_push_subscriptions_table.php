<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stores one Web Push subscription per (user, endpoint). `endpoint` is the
     * URL the push service gave the browser (FCM/Mozilla/Apple) and is globally
     * unique — collision means the same browser/device already subscribed, so
     * we UPSERT on it from the controller rather than letting the FK error.
     *
     * p256dh_key + auth_key are the ECDH public key + shared-auth secret the
     * browser generated at registration; required to encrypt the payload.
     */
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('endpoint')->unique();
            $table->text('p256dh_key');
            $table->text('auth_key');
            $table->text('user_agent')->nullable();
            $table->timestampTz('last_seen_at')->nullable();
            $table->timestampsTz();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
