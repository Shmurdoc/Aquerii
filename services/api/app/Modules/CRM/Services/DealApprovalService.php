<?php

namespace App\Modules\CRM\Services;

use App\Core\Jobs\SendNotification;
use App\Modules\CRM\Models\CrmApprovalRule;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Models\CrmDealApproval;
use Carbon\Carbon;

class DealApprovalService
{
    public function createApprovalIfNeeded(CrmDeal $deal): ?CrmDealApproval
    {
        $rule = CrmApprovalRule::where('workspace_id', $deal->workspace_id)
            ->where('is_active', true)
            ->where(function ($q) use ($deal) {
                $q->whereNull('threshold_min')
                    ->orWhere('threshold_min', '<=', $deal->value ?? 0);
            })
            ->where(function ($q) use ($deal) {
                $q->whereNull('threshold_max')
                    ->orWhere('threshold_max', '>=', $deal->value ?? 0);
            })
            ->first();

        if (! $rule) {
            return null;
        }

        $approvers = $rule->approvers ?? [];
        if (empty($approvers)) {
            return null;
        }

        $approval = CrmDealApproval::create([
            'workspace_id' => $deal->workspace_id,
            'deal_id' => $deal->id,
            'approval_rule_id' => $rule->id,
            'status' => 'pending',
            'current_approver_id' => $approvers[0]['user_id'] ?? null,
            'step' => 1,
            'approval_log' => [],
        ]);

        $this->notifyApprover($approval);

        return $approval;
    }

    public function approve(CrmDealApproval $approval, string $userId, ?string $note = null): void
    {
        $log = $approval->approval_log ?? [];
        $log[] = [
            'action' => 'approved',
            'user_id' => $userId,
            'note' => $note,
            'timestamp' => Carbon::now()->toIso8601String(),
        ];

        $rule = $approval->rule;
        $approvers = $rule?->approvers ?? [];
        $nextStep = $approval->step;

        if ($nextStep < count($approvers)) {
            $nextApprover = $approvers[$nextStep] ?? null;
            $approval->update([
                'step' => $nextStep + 1,
                'current_approver_id' => $nextApprover['user_id'] ?? null,
                'approval_log' => $log,
            ]);
            $this->notifyApprover($approval);
        } else {
            $approval->update([
                'status' => 'approved',
                'resolved_at' => Carbon::now(),
                'approval_log' => $log,
            ]);
        }
    }

    public function reject(CrmDealApproval $approval, string $userId, ?string $note = null): void
    {
        $log = $approval->approval_log ?? [];
        $log[] = [
            'action' => 'rejected',
            'user_id' => $userId,
            'note' => $note,
            'timestamp' => Carbon::now()->toIso8601String(),
        ];

        $approval->update([
            'status' => 'rejected',
            'resolved_at' => Carbon::now(),
            'approval_log' => $log,
        ]);
    }

    public function escalate(CrmDealApproval $approval): void
    {
        $rule = $approval->rule;
        if (! $rule?->escalation_user_id) {
            return;
        }

        $log = $approval->approval_log ?? [];
        $log[] = [
            'action' => 'escalated',
            'escalated_to' => $rule->escalation_user_id,
            'timestamp' => Carbon::now()->toIso8601String(),
        ];

        $approval->update([
            'current_approver_id' => $rule->escalation_user_id,
            'escalated_at' => Carbon::now(),
            'approval_log' => $log,
        ]);

        SendNotification::dispatch(
            $approval->workspace_id,
            $rule->escalation_user_id,
            'deal.approval.escalated',
            'Deal approval escalated',
            "Deal {$approval->deal?->title} requires your review.",
            'deal',
            $approval->deal_id
        );
    }

    public function checkEscalations(): void
    {
        CrmDealApproval::where('status', 'pending')
            ->whereNotNull('escalated_at')
            ->whereNull('resolved_at')
            ->chunk(100, function ($approvals) {
                foreach ($approvals as $approval) {
                    $rule = $approval->rule;
                    if (! $rule?->escalation_hours) {
                        continue;
                    }

                    $escalatedSince = $approval->escalated_at->diffInHours(now());
                    if ($escalatedSince >= $rule->escalation_hours) {
                        $this->escalate($approval);
                    }
                }
            });
    }

    protected function notifyApprover(CrmDealApproval $approval): void
    {
        if (! $approval->current_approver_id) {
            return;
        }

        SendNotification::dispatch(
            $approval->workspace_id,
            $approval->current_approver_id,
            'deal.approval.required',
            'Deal approval required',
            "Deal {$approval->deal?->title} requires your approval.",
            'deal',
            $approval->deal_id
        );
    }
}
