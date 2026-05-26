<?php

namespace App\Modules\CRM\Console\Commands;

use App\Modules\CRM\Services\DealApprovalService;
use Illuminate\Console\Command;

class CheckDealEscalations extends Command
{
    protected $signature = 'crm:check-deal-escalations';
    protected $description = 'Check and escalate overdue deal approvals';

    public function handle(DealApprovalService $approvalService): int
    {
        $this->info('Checking deal approval escalations...');
        $approvalService->checkEscalations();
        $this->info('Done.');

        return Command::SUCCESS;
    }
}
