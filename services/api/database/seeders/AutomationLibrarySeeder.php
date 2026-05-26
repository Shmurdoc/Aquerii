<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeds the automation_templates table with a library of preset automation templates.
 *
 * These are workspace-agnostic blueprints users can copy into their workspaces.
 * The controller can expose GET /automation-templates to return these for the UI picker.
 *
 * Categories:
 *   general    — universal task/item workflows
 *   project    — project management patterns
 *   crm        — CRM deal/contact flows
 *   billing    — subscription and payment alerts
 *   hr         — onboarding and people ops
 *   ecommerce  — shopping cart, inventory, pricing, reviews
 *   devops     — deploy, incident, backup, SLA monitoring
 *   marketing  — social media, campaigns, SEO, brand
 *   finance    — invoices, expenses, budgets, revenue
 *   security   — access, vulnerability, threat monitoring
 *   legal      — contracts, compliance, GDPR, NDAs
 *   support    — tickets, SLAs, surveys, auto-respond
 *   education  — courses, assignments, milestones, quizzes
 *   content    — approval, publishing, editorial workflows
 *   sales      — lead scoring, objection handling, pipelines
 */
class AutomationLibrarySeeder extends Seeder
{
    public function run(): void
    {
        $templates = $this->templates();

        foreach ($templates as $tpl) {
            $exists = DB::table('automation_templates')
                ->where('name', $tpl['name'])
                ->exists();

            if ($exists) {
                $this->command->line("  [skip] {$tpl['name']}");

                continue;
            }

            DB::table('automation_templates')->insert([
                'id' => (string) Str::uuid(),
                'name' => $tpl['name'],
                'description' => $tpl['description'],
                'category' => $tpl['category'],
                'trigger_type' => $tpl['trigger_type'],
                'trigger_config' => json_encode($tpl['trigger_config'] ?? []),
                'actions' => json_encode($tpl['actions']),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->command->info("  [seed] {$tpl['name']}");
        }

        $this->command->info('AutomationLibrarySeeder: '.count($templates).' templates processed.');
    }

    // -------------------------------------------------------------------------
    // Template definitions
    // -------------------------------------------------------------------------

    private function templates(): array
    {
        return [

            // ── GENERAL ──────────────────────────────────────────────────────

            [
                'name' => 'Auto-close completed items',
                'description' => 'When an item status changes to "done", mark it as closed and notify the creator.',
                'category' => 'general',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'done'],
                'actions' => [
                    [
                        'type' => 'change_status',
                        'value' => 'closed',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Item completed',
                        'body' => 'Your item has been marked as closed automatically.',
                    ],
                ],
            ],

            [
                'name' => 'Notify on new item creation',
                'description' => 'When a new item is created, send an in-app notification to the item creator.',
                'category' => 'general',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'New item created',
                        'body' => 'A new item has been added to the board.',
                    ],
                ],
            ],

            [
                'name' => 'Auto-assign on item creation',
                'description' => 'When a new item is created, assign it to a default user (configure user_id after copying).',
                'category' => 'general',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,  // must be configured by user
                    ],
                ],
            ],

            [
                'name' => 'Move item to archive on delete trigger',
                'description' => 'When an item is deleted, move it to an archive group before removal (configure group_id).',
                'category' => 'general',
                'trigger_type' => 'item.deleted',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'move_item',
                        'group_id' => null,  // must be configured by user
                    ],
                ],
            ],

            // ── PROJECT ───────────────────────────────────────────────────────

            [
                'name' => 'Escalate overdue items',
                'description' => 'When an item status changes to "overdue", reassign it and notify (configure user_id).',
                'category' => 'project',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'overdue'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Item escalated',
                        'body' => 'An overdue item has been escalated to you.',
                    ],
                ],
            ],

            [
                'name' => 'Create follow-up item on completion',
                'description' => 'When an item is marked done, auto-create a follow-up review item in the same group.',
                'category' => 'project',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'done'],
                'actions' => [
                    [
                        'type' => 'create_item',
                        'title' => 'Follow-up: review completed item',
                    ],
                ],
            ],

            [
                'name' => 'Assign new items to project lead',
                'description' => 'When a new item is created on a board, assign it to the project lead (configure user_id).',
                'category' => 'project',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'New item assigned to you',
                        'body' => 'A new project item has been assigned to you.',
                    ],
                ],
            ],

            [
                'name' => 'Move to In-Progress on assignee added',
                'description' => 'When a user is assigned to an item, automatically move its status to "in_progress".',
                'category' => 'project',
                'trigger_type' => 'assignee.added',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'change_status',
                        'value' => 'in_progress',
                    ],
                ],
            ],

            // ── CRM ───────────────────────────────────────────────────────────

            [
                'name' => 'Notify sales rep on deal status change',
                'description' => 'When a CRM deal item status changes, notify the assigned sales rep (configure user_id).',
                'category' => 'crm',
                'trigger_type' => 'status.changed',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Deal status updated',
                        'body' => 'A deal you own has changed status.',
                    ],
                ],
            ],

            [
                'name' => 'Create onboarding checklist on deal won',
                'description' => 'When a deal status changes to "won", create an onboarding checklist item.',
                'category' => 'crm',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'won'],
                'actions' => [
                    [
                        'type' => 'create_item',
                        'title' => 'Onboarding checklist for new client',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Deal won — onboarding started',
                        'body' => 'An onboarding checklist has been created for the new client.',
                    ],
                ],
            ],

            [
                'name' => 'Flag lost deals for review',
                'description' => 'When a deal is marked "lost", move it to a review group for post-mortem analysis.',
                'category' => 'crm',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'lost'],
                'actions' => [
                    [
                        'type' => 'move_item',
                        'group_id' => null,  // configure review group
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Deal lost — flagged for review',
                        'body' => 'A lost deal has been moved to the review group.',
                    ],
                ],
            ],

            // ── BILLING ───────────────────────────────────────────────────────

            [
                'name' => 'Alert on subscription item creation',
                'description' => 'When a billing subscription item is created, notify the billing admin.',
                'category' => 'billing',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'New subscription created',
                        'body' => 'A new subscription item has been added.',
                    ],
                ],
            ],

            [
                'name' => 'Escalate failed payment items',
                'description' => 'When a billing item status changes to "payment_failed", assign to billing team and notify.',
                'category' => 'billing',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'payment_failed'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,  // billing team lead
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Payment failed — action required',
                        'body' => 'A subscription payment has failed. Please investigate.',
                    ],
                ],
            ],

            // ── HR ────────────────────────────────────────────────────────────

            [
                'name' => 'Trigger onboarding on new hire item',
                'description' => 'When a new hire item is created, create an onboarding task list item.',
                'category' => 'hr',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'create_item',
                        'title' => 'Onboarding tasks for new hire',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'New hire onboarding started',
                        'body' => 'An onboarding checklist has been created for the new hire.',
                    ],
                ],
            ],

            [
                'name' => 'Notify manager on role change',
                'description' => 'When an HR item status changes (e.g. role update), notify the assigned manager.',
                'category' => 'hr',
                'trigger_type' => 'status.changed',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'HR status change',
                        'body' => 'An HR item status has changed. Please review.',
                    ],
                ],
            ],

            [
                'name' => 'Auto-assign HR items to HR lead',
                'description' => 'When a new HR item is created, auto-assign to the HR lead (configure user_id).',
                'category' => 'hr',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                ],
            ],

            // ── ECOMMERCE ─────────────────────────────────────────────────────

            [
                'name' => 'Abandoned cart recovery',
                'description' => 'When a cart item status changes to "abandoned", notify the sales team to follow up.',
                'category' => 'ecommerce',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'abandoned'],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Cart abandoned',
                        'body' => 'A shopping cart has been abandoned. Follow up with the customer.',
                    ],
                ],
            ],

            [
                'name' => 'Low stock alert',
                'description' => 'When an inventory item status changes to "low_stock", notify the purchasing team.',
                'category' => 'ecommerce',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'low_stock'],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Low stock',
                        'body' => 'An inventory item has reached low stock threshold. Reorder soon.',
                    ],
                ],
            ],

            [
                'name' => 'New order notification',
                'description' => 'When a new order item is created, notify the fulfillment team.',
                'category' => 'ecommerce',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'New order placed',
                        'body' => 'A new order has been received and needs fulfillment.',
                    ],
                ],
            ],

            [
                'name' => 'Order fulfillment workflow',
                'description' => 'When a new order is created, automatically move it to "processing" status and notify the team.',
                'category' => 'ecommerce',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'change_status',
                        'value' => 'processing',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Order processing started',
                        'body' => 'A new order has been moved to processing status.',
                    ],
                ],
            ],

            [
                'name' => 'Price change notification',
                'description' => 'When a product item is updated with a price change, notify the marketing team.',
                'category' => 'ecommerce',
                'trigger_type' => 'item.updated',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Price updated',
                        'body' => 'A product price has been changed. Update marketing materials.',
                    ],
                ],
            ],

            [
                'name' => 'Review moderation alert',
                'description' => 'When a product review item is created, notify the moderation team for approval.',
                'category' => 'ecommerce',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'New review pending',
                        'body' => 'A new product review has been submitted and needs moderation.',
                    ],
                ],
            ],

            [
                'name' => 'Back-in-stock notification',
                'description' => 'When an out-of-stock item status changes back to "in_stock", notify customers on the waitlist.',
                'category' => 'ecommerce',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'in_stock'],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Back in stock',
                        'body' => 'An item is back in stock. Notify waitlist subscribers.',
                    ],
                ],
            ],

            [
                'name' => 'Return request triage',
                'description' => 'When a return item is created, assign it to the returns team and notify them.',
                'category' => 'ecommerce',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Return request',
                        'body' => 'A new return request has been submitted and assigned to you.',
                    ],
                ],
            ],

            // ── DEVOPS ────────────────────────────────────────────────────────

            [
                'name' => 'Deploy failure alert',
                'description' => 'When a deployment item status changes to "failed", assign to devops lead and notify.',
                'category' => 'devops',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'failed'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Deploy failed',
                        'body' => 'A deployment has failed. Immediate attention required.',
                    ],
                ],
            ],

            [
                'name' => 'Incident auto-escalation',
                'description' => 'When an incident item status changes to "critical", escalate to senior engineer and notify on-call.',
                'category' => 'devops',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'critical'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Critical incident',
                        'body' => 'A critical incident requires immediate attention.',
                    ],
                ],
            ],

            [
                'name' => 'SSL cert expiry tracking',
                'description' => 'When an SSL certificate item is created, schedule renewal reminder and notify admin.',
                'category' => 'devops',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'SSL cert tracked',
                        'body' => 'An SSL certificate has been added for expiry monitoring.',
                    ],
                ],
            ],

            [
                'name' => 'Backup verification check',
                'description' => 'When a backup item status changes to "completed", verify and notify the team.',
                'category' => 'devops',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'completed'],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Backup completed',
                        'body' => 'A backup has completed successfully. Verify integrity.',
                    ],
                ],
            ],

            [
                'name' => 'SLA breach escalation',
                'description' => 'When a service item status changes to "breached", assign to account manager and notify.',
                'category' => 'devops',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'breached'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'SLA breach',
                        'body' => 'An SLA has been breached. Escalating to account management.',
                    ],
                ],
            ],

            [
                'name' => 'Infrastructure cost alert',
                'description' => 'When a cost item status changes to "over_threshold", notify the finance and devops teams.',
                'category' => 'devops',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'over_threshold'],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Cost threshold exceeded',
                        'body' => 'Infrastructure costs have exceeded the budget threshold.',
                    ],
                ],
            ],

            // ── MARKETING ─────────────────────────────────────────────────────

            [
                'name' => 'Social media content approval',
                'description' => 'When a social media post item status changes to "draft", assign to reviewer for approval.',
                'category' => 'marketing',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'draft'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Content ready for review',
                        'body' => 'A social media post draft is ready for your review.',
                    ],
                ],
            ],

            [
                'name' => 'Campaign launch sequence',
                'description' => 'When a campaign item status changes to "approved", create launch checklist items and notify the team.',
                'category' => 'marketing',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'approved'],
                'actions' => [
                    [
                        'type' => 'create_item',
                        'title' => 'Campaign launch checklist',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Campaign approved',
                        'body' => 'A marketing campaign has been approved. Launch sequence started.',
                    ],
                ],
            ],

            [
                'name' => 'Brand mention alert',
                'description' => 'When a brand mention item is created, notify the PR team for response.',
                'category' => 'marketing',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Brand mention detected',
                        'body' => 'A new brand mention has been captured. PR team should review.',
                    ],
                ],
            ],

            [
                'name' => 'SEO content brief generator',
                'description' => 'When a new content item is created, assign it to an SEO writer and notify them.',
                'category' => 'marketing',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'New content assignment',
                        'body' => 'A new SEO content brief has been assigned to you.',
                    ],
                ],
            ],

            [
                'name' => 'Newsletter draft review',
                'description' => 'When a newsletter item status changes to "draft", assign to editor for review.',
                'category' => 'marketing',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'draft'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Newsletter ready for review',
                        'body' => 'A newsletter draft is ready for editorial review.',
                    ],
                ],
            ],

            [
                'name' => 'Content repurposing workflow',
                'description' => 'When a content item status changes to "published", create repurposing tasks for other channels.',
                'category' => 'marketing',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'published'],
                'actions' => [
                    [
                        'type' => 'create_item',
                        'title' => 'Repurpose for social media',
                    ],
                    [
                        'type' => 'create_item',
                        'title' => 'Repurpose for newsletter',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Content published',
                        'body' => 'Content has been published. Repurposing tasks have been created.',
                    ],
                ],
            ],

            [
                'name' => 'Competitor watch alert',
                'description' => 'When a competitor intelligence item is created, notify the strategy team.',
                'category' => 'marketing',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Competitor update',
                        'body' => 'New competitor intelligence has been captured. Review for strategic impact.',
                    ],
                ],
            ],

            // ── FINANCE ───────────────────────────────────────────────────────

            [
                'name' => 'Invoice overdue escalation',
                'description' => 'When an invoice status changes to "overdue", assign to collections and notify the finance team.',
                'category' => 'finance',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'overdue'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Invoice overdue',
                        'body' => 'An invoice is now overdue and has been assigned for collections.',
                    ],
                ],
            ],

            [
                'name' => 'Expense report approval',
                'description' => 'When an expense report is created, assign to manager for approval and notify them.',
                'category' => 'finance',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Expense report pending',
                        'body' => 'An expense report has been submitted and needs your approval.',
                    ],
                ],
            ],

            [
                'name' => 'Budget threshold alert',
                'description' => 'When a budget item status changes to "threshold_reached", notify the department head.',
                'category' => 'finance',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'threshold_reached'],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Budget threshold reached',
                        'body' => 'A budget threshold has been reached. Review spending.',
                    ],
                ],
            ],

            [
                'name' => 'Revenue milestone celebration',
                'description' => 'When a deal item status changes to "won" and revenue exceeds configurable threshold, celebrate with team notification.',
                'category' => 'finance',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'won'],
                'actions' => [
                    [
                        'type' => 'create_item',
                        'title' => 'Revenue milestone celebration',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Revenue milestone!',
                        'body' => 'A significant revenue milestone has been reached. Celebrate!',
                    ],
                ],
            ],

            [
                'name' => 'Audit trail logging',
                'description' => 'When a financial item is updated, log the change and notify the compliance team.',
                'category' => 'finance',
                'trigger_type' => 'item.updated',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Financial record updated',
                        'body' => 'A financial record has been modified. Audit trail recorded.',
                    ],
                ],
            ],

            [
                'name' => 'Payment reconciliation alert',
                'description' => 'When a payment item status changes to "unmatched", assign to accountant and notify.',
                'category' => 'finance',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'unmatched'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Unmatched payment',
                        'body' => 'A payment could not be matched to an invoice. Needs investigation.',
                    ],
                ],
            ],

            // ── SECURITY ──────────────────────────────────────────────────────

            [
                'name' => 'Access revocation review',
                'description' => 'When an access request item is created for offboarding, assign to security for review.',
                'category' => 'security',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Access revocation needed',
                        'body' => 'An access revocation request requires your review and action.',
                    ],
                ],
            ],

            [
                'name' => 'Vulnerability report triage',
                'description' => 'When a vulnerability item is created, assign to the security team and notify.',
                'category' => 'security',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Vulnerability reported',
                        'body' => 'A security vulnerability has been reported and assigned to you.',
                    ],
                ],
            ],

            [
                'name' => 'Security incident response',
                'description' => 'When a security incident status changes to "confirmed", change status to "investigating" and notify the response team.',
                'category' => 'security',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'confirmed'],
                'actions' => [
                    [
                        'type' => 'change_status',
                        'value' => 'investigating',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Security incident confirmed',
                        'body' => 'A security incident has been confirmed. Response team activated.',
                    ],
                ],
            ],

            [
                'name' => 'Threat intelligence alert',
                'description' => 'When a threat intelligence item is created, notify the security operations team.',
                'category' => 'security',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Threat intel update',
                        'body' => 'New threat intelligence has been received. Review and assess impact.',
                    ],
                ],
            ],

            [
                'name' => 'Compliance finding assignment',
                'description' => 'When a compliance finding item is created, assign to the compliance officer and notify.',
                'category' => 'security',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Compliance finding',
                        'body' => 'A compliance finding has been reported and assigned to you for remediation.',
                    ],
                ],
            ],

            // ── LEGAL ─────────────────────────────────────────────────────────

            [
                'name' => 'Contract renewal reminder',
                'description' => 'When a contract item status changes to "expiring_soon", notify the legal team and assign for review.',
                'category' => 'legal',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'expiring_soon'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Contract expiring soon',
                        'body' => 'A contract is approaching its expiration date. Review for renewal.',
                    ],
                ],
            ],

            [
                'name' => 'Document approval workflow',
                'description' => 'When a legal document item status changes to "needs_review", assign to legal counsel and notify.',
                'category' => 'legal',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'needs_review'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Document needs review',
                        'body' => 'A legal document is ready for your review.',
                    ],
                ],
            ],

            [
                'name' => 'NDA signing workflow',
                'description' => 'When an NDA item is created, generate a signing task and notify the counterparty.',
                'category' => 'legal',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'create_item',
                        'title' => 'NDA signing task',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'NDA ready for signature',
                        'body' => 'An NDA has been generated and is ready for signature.',
                    ],
                ],
            ],

            [
                'name' => 'GDPR data request handling',
                'description' => 'When a GDPR request item is created, assign to data protection officer and notify.',
                'category' => 'legal',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'change_status',
                        'value' => 'in_progress',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'GDPR request received',
                        'body' => 'A GDPR data subject request has been submitted. Action required within 30 days.',
                    ],
                ],
            ],

            [
                'name' => 'Policy update notification',
                'description' => 'When a policy item status changes to "updated", notify all employees about the change.',
                'category' => 'legal',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'updated'],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Policy updated',
                        'body' => 'A company policy has been updated. Please review the changes.',
                    ],
                ],
            ],

            // ── SUPPORT ───────────────────────────────────────────────────────

            [
                'name' => 'Ticket auto-responder',
                'description' => 'When a support ticket is created, send an acknowledgment notification to the requester.',
                'category' => 'support',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Ticket received',
                        'body' => 'Your support ticket has been received. We aim to respond within 24 hours.',
                    ],
                ],
            ],

            [
                'name' => 'Priority escalation',
                'description' => 'When a support ticket status changes to "urgent", assign to senior agent and notify.',
                'category' => 'support',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'urgent'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Urgent ticket escalated',
                        'body' => 'An urgent support ticket has been escalated to you.',
                    ],
                ],
            ],

            [
                'name' => 'SLA breach notification',
                'description' => 'When a support ticket status changes to "sla_breached", notify the support manager.',
                'category' => 'support',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'sla_breached'],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'SLA breach on ticket',
                        'body' => 'A support ticket has breached its SLA. Manager attention required.',
                    ],
                ],
            ],

            [
                'name' => 'Customer satisfaction survey',
                'description' => 'When a ticket status changes to "resolved", send a satisfaction survey request.',
                'category' => 'support',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'resolved'],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'How did we do?',
                        'body' => 'Your ticket has been resolved. Please rate your support experience.',
                    ],
                ],
            ],

            [
                'name' => 'Knowledge base update trigger',
                'description' => 'When a ticket is resolved, create a knowledge base draft item if the solution was novel.',
                'category' => 'support',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'resolved'],
                'actions' => [
                    [
                        'type' => 'create_item',
                        'title' => 'Knowledge base article draft',
                    ],
                ],
            ],

            // ── EDUCATION ─────────────────────────────────────────────────────

            [
                'name' => 'Assignment submission notification',
                'description' => 'When a student assignment item is created, notify the instructor for grading.',
                'category' => 'education',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Assignment submitted',
                        'body' => 'A student has submitted an assignment and is ready for grading.',
                    ],
                ],
            ],

            [
                'name' => 'Course enrollment confirmation',
                'description' => 'When a course enrollment item is created, send a welcome notification with next steps.',
                'category' => 'education',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Welcome to the course',
                        'body' => 'You have been enrolled. Check the course materials to get started.',
                    ],
                ],
            ],

            [
                'name' => 'Study milestone tracking',
                'description' => 'When a study plan item status changes to "milestone_reached", notify the student and create next milestone.',
                'category' => 'education',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'milestone_reached'],
                'actions' => [
                    [
                        'type' => 'create_item',
                        'title' => 'Next study milestone',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Milestone reached!',
                        'body' => 'Congratulations on reaching your study milestone. Keep going!',
                    ],
                ],
            ],

            [
                'name' => 'Grade publishing workflow',
                'description' => 'When an assessment item status changes to "graded", notify the student and release results.',
                'category' => 'education',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'graded'],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Grades published',
                        'body' => 'Your assessment grades have been published. Check your results.',
                    ],
                ],
            ],

            // ── CONTENT ───────────────────────────────────────────────────────

            [
                'name' => 'Content approval workflow',
                'description' => 'When a content item status changes to "submitted", assign to approver and notify.',
                'category' => 'content',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'submitted'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Content ready for approval',
                        'body' => 'A content piece has been submitted and needs your approval.',
                    ],
                ],
            ],

            [
                'name' => 'Publishing schedule kickoff',
                'description' => 'When a content item status changes to "scheduled", create the publishing task and notify the team.',
                'category' => 'content',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'scheduled'],
                'actions' => [
                    [
                        'type' => 'create_item',
                        'title' => 'Publishing task',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Content scheduled',
                        'body' => 'Content has been scheduled for publication. Publishing task created.',
                    ],
                ],
            ],

            [
                'name' => 'Editorial assignment',
                'description' => 'When a new content request is created, assign to the editor-in-chief and notify.',
                'category' => 'content',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'New editorial assignment',
                        'body' => 'A new content request has been assigned to you.',
                    ],
                ],
            ],

            [
                'name' => 'Content expiry review',
                'description' => 'When a content item status changes to "expiring", assign to author for review and refresh.',
                'category' => 'content',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'expiring'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Content expiring',
                        'body' => 'Your content piece is expiring soon. Please review and refresh.',
                    ],
                ],
            ],

            // ── SALES ─────────────────────────────────────────────────────────

            [
                'name' => 'Lead scoring assignment',
                'description' => 'When a lead item status changes to "qualified", assign to a sales rep and notify.',
                'category' => 'sales',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 'qualified'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Qualified lead assigned',
                        'body' => 'A qualified lead has been assigned to you. Follow up promptly.',
                    ],
                ],
            ],

            [
                'name' => 'Deal stage progression alert',
                'description' => 'When a deal item status changes, notify the sales manager of the progression.',
                'category' => 'sales',
                'trigger_type' => 'status.changed',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'send_notification',
                        'title' => 'Deal stage changed',
                        'body' => 'A deal has progressed to a new stage. Review the latest updates.',
                    ],
                ],
            ],

            [
                'name' => 'Proposal generated notification',
                'description' => 'When a proposal item is created, notify the sales rep and assign for follow-up.',
                'category' => 'sales',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Proposal ready',
                        'body' => 'A new proposal has been generated and assigned to you for delivery.',
                    ],
                ],
            ],

            [
                'name' => 'Lead re-engagement',
                'description' => 'When a cold lead item status changes to "re_engage", assign to SDR for follow-up and notify.',
                'category' => 'sales',
                'trigger_type' => 'status.changed',
                'trigger_config' => ['to_status' => 're_engage'],
                'actions' => [
                    [
                        'type' => 'assign_user',
                        'user_id' => null,
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Lead re-engagement',
                        'body' => 'A cold lead has been flagged for re-engagement. Reach out.',
                    ],
                ],
            ],

            [
                'name' => 'Sales call follow-up',
                'description' => 'When a call log item is created after a sales call, create a follow-up task and notify the rep.',
                'category' => 'sales',
                'trigger_type' => 'item.created',
                'trigger_config' => [],
                'actions' => [
                    [
                        'type' => 'create_item',
                        'title' => 'Sales call follow-up',
                    ],
                    [
                        'type' => 'send_notification',
                        'title' => 'Follow-up needed',
                        'body' => 'A sales call follow-up task has been created. Action items pending.',
                    ],
                ],
            ],

        ];
    }
}
