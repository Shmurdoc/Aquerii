<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add FK indexes for tables/columns created by migrations after the
     * baseline `2026_05_27_000069_add_missing_fk_indexes.php` ran.
     *
     * PostgreSQL does NOT auto-index foreign key columns. Without an index,
     * any UPDATE or DELETE on a parent table triggers a sequential scan on
     * each child table to verify no rows reference the changing PK — a
     * catastrophic regression on large tables.
     *
     * Each `Schema::table()` call is wrapped in a try/catch so re-running
     * this migration (e.g. in tests) is idempotent.
     */
    private array $tables = [
        'crm_deals' => ['workspace_id'],
        'crm_contacts' => ['stage_id'],
        'support_kb_articles' => ['ticket_id'],

        'chat_channels' => ['created_by'],
        'chat_messages' => ['user_id', 'reply_to'],

        'inbound_emails' => ['project_email_address_id'],

        'goals' => ['owner_id'],
        'key_results' => ['owner_id'],
        'meeting_outcomes' => ['linked_goal_id'],

        'scenarios' => ['created_by'],
        'automation_recommendations' => ['automation_id'],

        'invoice_approval_requests' => ['requested_by', 'approver_user_id'],
        'report_schedules' => ['created_by'],

        'job_cards' => ['assigned_to', 'signed_off_by', 'created_by'],
        'job_card_tasks' => ['job_card_id', 'completed_by'],
        'job_card_time_entries' => ['job_card_id', 'user_id'],
        'job_card_attachments' => ['job_card_id', 'uploaded_by'],
        'job_card_templates' => ['workspace_id', 'created_by'],
        'job_card_materials' => ['job_card_id', 'created_by'],

        'delegations' => ['item_id', 'from_user_id', 'accepted_by'],

        'templates' => ['created_by'],

        'journal_entries' => ['posted_by', 'reversal_of'],

        'employee_documents' => ['uploaded_by'],
    ];

    public function up(): void
    {
        foreach ($this->tables as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($table, $columns) {
                foreach ($columns as $column) {
                    $indexName = "idx_{$table}_{$column}";
                    try {
                        $blueprint->index($column, $indexName);
                    } catch (Throwable) {
                        // Index already exists — safe to skip
                    }
                }
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($table, $columns) {
                foreach ($columns as $column) {
                    $indexName = "idx_{$table}_{$column}";
                    try {
                        $blueprint->dropIndex($indexName);
                    } catch (Throwable) {
                        // Index didn't exist — safe to skip
                    }
                }
            });
        }
    }
};
