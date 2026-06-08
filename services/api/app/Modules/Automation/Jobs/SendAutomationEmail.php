<?php

namespace App\Modules\Automation\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendAutomationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly string $to,
        public readonly string $subject,
        public readonly string $body,
        public readonly string $workspaceId,
        public readonly string $itemId,
    ) {}

    public function handle(): void
    {
        if (empty($this->to)) {
            Log::warning('SendAutomationEmail skipped: no recipient', [
                'item_id' => $this->itemId,
                'workspace_id' => $this->workspaceId,
            ]);

            return;
        }

        Mail::raw($this->body, function ($message) {
            $message->to($this->to)
                ->subject($this->subject);
        });
    }
}
