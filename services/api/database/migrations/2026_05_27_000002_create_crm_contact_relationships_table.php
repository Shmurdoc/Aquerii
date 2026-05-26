<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_contact_relationships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('contact_id');
            $table->uuid('related_contact_id');
            $table->string('relationship_type', 50);
            $table->timestampsTz();

            $table->unique(['contact_id', 'related_contact_id', 'relationship_type'], 'crm_rel_unique');
            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->foreign('contact_id')->references('id')->on('crm_contacts')->cascadeOnDelete();
            $table->foreign('related_contact_id')->references('id')->on('crm_contacts')->cascadeOnDelete();
            $table->index('workspace_id');
            $table->index('contact_id');
            $table->index('related_contact_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_contact_relationships');
    }
};
