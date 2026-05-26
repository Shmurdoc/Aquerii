<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('meetings')) {
            Schema::create('meetings', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('workspace_id');
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('location')->nullable();
                $table->string('meeting_url')->nullable();
                $table->timestampTz('starts_at');
                $table->timestampTz('ends_at');
                $table->string('status', 30)->default('scheduled');
                $table->uuid('organizer_id');
                $table->string('provider', 30)->default('zoom');
                $table->string('provider_meeting_id')->nullable();
                $table->string('recurrence_rule', 255)->nullable();
                $table->uuid('parent_meeting_id')->nullable();
                $table->jsonb('settings')->nullable();
                $table->timestampsTz();
                $table->softDeletesTz();
                $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
                $table->foreign('organizer_id')->references('id')->on('users');
                $table->index(['workspace_id', 'starts_at']);
            });

            Schema::create('meeting_attendees', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('meeting_id');
                $table->uuid('user_id')->nullable();
                $table->string('email');
                $table->string('name')->nullable();
                $table->string('status', 20)->default('pending');
                $table->boolean('required')->default(true);
                $table->timestampTz('responded_at')->nullable();
                $table->timestampsTz();
                $table->foreign('meeting_id')->references('id')->on('meetings')->cascadeOnDelete();
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
                $table->unique(['meeting_id', 'email']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_attendees');
        Schema::dropIfExists('meetings');
    }
};
