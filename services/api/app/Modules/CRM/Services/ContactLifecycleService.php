<?php

namespace App\Modules\CRM\Services;

use App\Modules\CRM\Models\CrmContact;
use App\Modules\CRM\Models\CrmContactStageHistory;
use Illuminate\Support\Facades\DB;

class ContactLifecycleService
{
    const STAGES = ['lead', 'mql', 'sql', 'customer', 'advocate'];

    const VALID_TRANSITIONS = [
        'lead' => ['mql'],
        'mql' => ['sql', 'lead'],
        'sql' => ['customer', 'mql'],
        'customer' => ['advocate', 'sql'],
        'advocate' => ['customer'],
    ];

    public function transition(CrmContact $contact, string $toStage, ?string $reason = null, ?string $changedById = null): CrmContact
    {
        $fromStage = $contact->lifecycle_stage ?? 'lead';

        if ($fromStage === $toStage) {
            return $contact;
        }

        if (! $this->isValidTransition($fromStage, $toStage)) {
            throw new \InvalidArgumentException(
                "Invalid lifecycle transition: {$fromStage} -> {$toStage}. "
                ."Allowed from {$fromStage}: ".implode(', ', self::VALID_TRANSITIONS[$fromStage] ?? [])
            );
        }

        DB::transaction(function () use ($contact, $fromStage, $toStage, $reason, $changedById) {
            $contact->update(['lifecycle_stage' => $toStage]);

            CrmContactStageHistory::create([
                'workspace_id' => $contact->workspace_id,
                'contact_id' => $contact->id,
                'from_stage' => $fromStage,
                'to_stage' => $toStage,
                'reason' => $reason,
                'changed_by' => $changedById,
                'created_at' => now(),
            ]);
        });

        return $contact->fresh();
    }

    public function isValidTransition(string $from, string $to): bool
    {
        if ($from === $to) {
            return true;
        }

        return in_array($to, self::VALID_TRANSITIONS[$from] ?? []);
    }

    public function getHistory(CrmContact $contact): array
    {
        return $contact->stageHistory()->orderByDesc('created_at')->get()->toArray();
    }
}
