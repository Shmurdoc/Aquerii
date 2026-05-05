<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendBillingConfirmationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly string $userId,
        public readonly string $eventType,
        public readonly array  $details,
    ) {}

    public function handle(): void
    {
        $user = User::find($this->userId);
        if (!$user) return;

        // Mail::to($user)->send(new \App\Mail\BillingConfirmation($this->eventType, $this->details));
        // TODO: implement Mailable class
    }
}
