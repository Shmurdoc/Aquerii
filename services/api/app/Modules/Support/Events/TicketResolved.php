<?php

namespace App\Modules\Support\Events;

use App\Modules\Support\Models\Ticket;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketResolved
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Ticket $ticket,
    ) {}
}
