<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'employee_groups' => ['workspace_id', 'manager_id'],
        'workspace_members' => ['employee_group_id', 'reports_to'],
        'boards' => ['workspace_id', 'created_by'],
        'board_groups' => ['board_id'],
        'board_columns' => ['board_id'],
        'items' => ['board_id', 'group_id', 'created_by', 'parent_id'],
        'item_assignees' => ['item_id'],
        'item_dependencies' => ['item_id', 'depends_on_id'],
        'crm_contacts' => ['company_id'],
        'crm_deals' => ['pipeline_id', 'stage_id', 'contact_id', 'company_id'],
        'crm_pipeline_stages' => ['pipeline_id'],
        'crm_contact_stage_history' => ['workspace_id', 'changed_by'],
        'crm_leads' => ['contact_id'],
        'crm_sequence_enrollments' => ['sequence_id', 'contact_id', 'deal_id'],
        'crm_call_logs' => ['deal_id'],
        'crm_sequences' => ['created_by'],
        'documents' => ['folder_id', 'linked_item_id', 'created_by'],
        'document_folders' => ['created_by', 'parent_id'],
        'emails' => ['workspace_id', 'email_account_id', 'thread_id'],
        'email_threads' => ['workspace_id', 'email_account_id'],
        'email_accounts' => ['workspace_id'],
        'email_attachments' => ['email_id'],
        'email_ai_suggestions' => ['workspace_id', 'email_id'],
        'support_tickets' => ['contact_id', 'sla_policy_id'],
        'support_ticket_messages' => ['user_id'],
        'support_sla_breaches' => ['sla_policy_id', 'escalated_to'],
        'support_kb_articles' => ['author_id'],
        'meetings' => ['organizer_id'],
        'meeting_attendees' => ['meeting_id', 'user_id'],
        'oauth_accounts' => ['user_id'],
        'expense_claims' => ['user_id', 'approved_by'],
        'leave_requests' => ['user_id', 'approved_by'],
        'attendance_logs' => ['user_id'],
        'automation_logs' => ['automation_id', 'item_id'],
        'activities' => ['created_by'],
        'file_uploads' => ['uploaded_by'],
        'invoice_payments' => ['workspace_id'],
    ];

    public function up(): void
    {
        foreach ($this->tables as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $table) use ($columns) {
                foreach ($columns as $column) {
                    $indexName = "idx_{$table}_{$column}";
                    try {
                        $table->index($column, $indexName);
                    } catch (\Exception) {
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

            Schema::table($table, function (Blueprint $table) use ($columns) {
                foreach ($columns as $column) {
                    $indexName = "idx_{$table}_{$column}";
                    try {
                        $table->dropIndex($indexName);
                    } catch (\Exception) {
                    }
                }
            });
        }
    }
};
