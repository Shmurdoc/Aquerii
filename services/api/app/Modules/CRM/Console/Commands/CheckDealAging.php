<?php

namespace App\Modules\CRM\Console\Commands;

use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Services\CrmAutomationService;
use Illuminate\Console\Command;

class CheckDealAging extends Command
{
    protected $signature = 'crm:check-deal-aging';
    protected $description = 'Trigger automation for aging deals';

    public function handle(CrmAutomationService $automationService): int
    {
        $this->info('Checking aging deals...');

        CrmDeal::whereNull('won_at')
            ->whereNull('lost_at')
            ->where('created_at', '<', now()->subDays(30))
            ->chunk(100, function ($deals) use ($automationService) {
                foreach ($deals as $deal) {
                    $automationService->evaluate($deal->workspace_id, 'deal.aging', [
                        'deal_id'     => $deal->id,
                        'value'       => $deal->value,
                        'days_open'   => now()->diffInDays($deal->created_at),
                        'entity_id'   => $deal->id,
                        'entity_type' => 'deal',
                    ]);
                }
            });

        $this->info('Done.');

        return Command::SUCCESS;
    }
}
