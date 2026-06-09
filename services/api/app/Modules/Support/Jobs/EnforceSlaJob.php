<?php

namespace App\Modules\Support\Jobs;

use App\Modules\Support\Models\SlaBreach;
use App\Modules\Support\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;

class EnforceSlaJob implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function handle(): void
    {
        Ticket::whereNull('closed_at')
            ->whereNull('sla_breached_at')
            ->whereNotNull('sla_due_at')
            ->where('sla_due_at', '<', Carbon::now())
            ->chunk(100, function ($tickets) {
                foreach ($tickets as $ticket) {
                    $ticket->update(['sla_breached_at' => Carbon::now()]);

                    SlaBreach::create([
                        'ticket_id' => $ticket->id,
                        'sla_policy_id' => $ticket->sla_policy_id,
                        'breach_type' => 'resolution',
                        'breached_at' => Carbon::now(),
                    ]);
                }
            });
    }
}
