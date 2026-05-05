<?php

namespace App\Events;

use App\Models\Item;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ItemUpdated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Item $item,
        public readonly array $old,
        public readonly array $changes,
        public readonly string $actorId,
    ) {}
}
