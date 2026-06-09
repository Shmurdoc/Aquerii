<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cert_notification_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuidMorphs('record');
            $table->string('tier', 10);
            $table->jsonb('notified_user_ids');
            $table->date('expires_at');
            $table->timestampTz('notified_at')->useCurrent();
            $table->unique(['record_type', 'record_id', 'tier']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cert_notification_logs');
    }
};
