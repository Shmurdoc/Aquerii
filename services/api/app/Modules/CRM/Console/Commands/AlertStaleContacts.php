<?php

namespace App\Modules\CRM\Console\Commands;

use App\Core\Models\Notification;
use App\Modules\CRM\Models\CrmContact;
use Illuminate\Console\Command;

class AlertStaleContacts extends Command
{
    protected $signature = 'crm:alert-stale-contacts {--days=90 : Days since last touch}';

    protected $description = 'Create notifications for contacts that have not been touched in N days';

    public function handle(): int
    {
        $days = (int) $this->option('days');

        $staleContacts = CrmContact::where(function ($q) use ($days) {
            $q->where('last_touched_at', '<', now()->subDays($days))
                ->orWhereNull('last_touched_at');
        })->get();

        if ($staleContacts->isEmpty()) {
            $this->info('No stale contacts found.');

            return 0;
        }

        $notified = 0;
        foreach ($staleContacts as $contact) {
            Notification::create([
                'workspace_id' => $contact->workspace_id,
                'type' => 'stale_contact',
                'data' => [
                    'message' => "Contact {$contact->full_name} has not been touched in over {$days} days.",
                    'contact_id' => $contact->id,
                ],
            ]);
            $notified++;
        }

        $this->info("Created {$notified} notifications for stale contacts.");

        return 0;
    }
}
