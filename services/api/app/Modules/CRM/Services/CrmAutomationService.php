<?php

namespace App\Modules\CRM\Services;

use App\Core\Jobs\SendNotification;
use App\Modules\CRM\Models\CrmAutomationRule;
use App\Modules\CRM\Models\CrmContact;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\Support\Models\Ticket;
use Illuminate\Support\Facades\Log;

class CrmAutomationService
{
    public const TRIGGERS = [
        'contact.created',
        'contact.stage_changed',
        'contact.score_threshold',
        'deal.created',
        'deal.stage_changed',
        'deal.won',
        'deal.lost',
        'deal.aging',
        'ticket.created',
        'ticket.sla_breach',
    ];

    public function evaluate(string $workspaceId, string $trigger, array $context = []): void
    {
        $rules = CrmAutomationRule::where('workspace_id', $workspaceId)
            ->where('trigger_type', $trigger)
            ->where('is_active', true)
            ->get();

        foreach ($rules as $rule) {
            if ($this->conditionsMet($rule, $context)) {
                $this->execute($rule, $context);
            }
        }
    }

    protected function conditionsMet(CrmAutomationRule $rule, array $context): bool
    {
        $conditions = $rule->conditions ?? [];

        foreach ($conditions as $key => $expected) {
            $actual = $context[$key] ?? null;

            if (is_array($expected)) {
                if (! in_array($actual, $expected, true)) {
                    return false;
                }
            } elseif ($actual !== $expected) {
                return false;
            }
        }

        return true;
    }

    protected function execute(CrmAutomationRule $rule, array $context): void
    {
        try {
            foreach ($rule->actions as $action) {
                $this->executeAction($action, $rule, $context);
            }

            $rule->increment('run_count');
            $rule->update(['last_run_at' => now()]);
        } catch (\Throwable $e) {
            Log::error('CrmAutomationService action failed', [
                'rule_id' => $rule->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    protected function executeAction(array $action, CrmAutomationRule $rule, array $context): void
    {
        $type = $action['type'] ?? null;

        switch ($type) {
            case 'send_notification':
                $userId = $action['user_id'] ?? null;
                if ($userId) {
                    SendNotification::dispatch(
                        $rule->workspace_id,
                        $userId,
                        $action['notification_type'] ?? 'crm.automation',
                        $action['title'] ?? 'CRM automation triggered',
                        $action['body'] ?? null,
                        $context['entity_type'] ?? 'crm',
                        $context['entity_id'] ?? null
                    );
                }
                break;

            case 'update_deal_stage':
                $dealId = $context['deal_id'] ?? $context['entity_id'] ?? null;
                $stageId = $action['stage_id'] ?? null;
                if ($dealId && $stageId) {
                    CrmDeal::where('id', $dealId)->update(['stage_id' => $stageId]);
                }
                break;

            case 'update_contact_stage':
                $contactId = $context['contact_id'] ?? $context['entity_id'] ?? null;
                $stage = $action['lifecycle_stage'] ?? null;
                if ($contactId && $stage) {
                    CrmContact::where('id', $contactId)->update(['lifecycle_stage' => $stage]);
                }
                break;

            case 'assign_deal':
                $dealId = $context['deal_id'] ?? $context['entity_id'] ?? null;
                $ownerId = $action['owner_id'] ?? null;
                if ($dealId && $ownerId) {
                    CrmDeal::where('id', $dealId)->update(['owner_id' => $ownerId]);
                }
                break;

            case 'assign_ticket':
                $ticketId = $context['ticket_id'] ?? $context['entity_id'] ?? null;
                $assigneeId = $action['assigned_to'] ?? null;
                if ($ticketId && $assigneeId) {
                    Ticket::where('id', $ticketId)->update(['assigned_to' => $assigneeId]);
                }
                break;

            case 'score_contact':
                $contactId = $context['contact_id'] ?? $context['entity_id'] ?? null;
                $score = $action['score'] ?? null;
                if ($contactId && $score !== null) {
                    CrmContact::where('id', $contactId)->increment('lead_score', (int) $score);
                }
                break;

            default:
                Log::warning('CrmAutomationService: unknown action', [
                    'type' => $type,
                    'rule_id' => $rule->id,
                ]);
        }
    }
}
