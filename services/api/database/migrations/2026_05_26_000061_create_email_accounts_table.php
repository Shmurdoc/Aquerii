<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('email_accounts')) {
            return;
        }

        Schema::create('email_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('user_id')->nullable();
            $table->string('name');
            $table->string('email_address');
            $table->string('imap_host');
            $table->integer('imap_port');
            $table->boolean('imap_ssl')->default(true);
            $table->string('imap_username');
            $table->text('imap_password_encrypted');
            $table->string('smtp_host');
            $table->integer('smtp_port');
            $table->boolean('smtp_ssl')->default(true);
            $table->string('smtp_username');
            $table->text('smtp_password_encrypted')->nullable();
            $table->string('status')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->index('workspace_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_accounts');
    }
};
