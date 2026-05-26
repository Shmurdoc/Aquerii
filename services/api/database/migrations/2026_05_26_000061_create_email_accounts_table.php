<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('user_id');
            $table->string('name');
            $table->string('email_address');
            $table->string('imap_host');
            $table->unsignedSmallInteger('imap_port')->default(993);
            $table->boolean('imap_ssl')->default(true);
            $table->string('imap_username');
            $table->text('imap_password_encrypted');
            $table->string('smtp_host')->nullable();
            $table->unsignedSmallInteger('smtp_port')->default(587);
            $table->boolean('smtp_ssl')->default(true);
            $table->string('smtp_username')->nullable();
            $table->text('smtp_password_encrypted')->nullable();
            $table->string('status')->default('active'); // active|error|paused
            $table->text('last_error')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_accounts');
    }
};
