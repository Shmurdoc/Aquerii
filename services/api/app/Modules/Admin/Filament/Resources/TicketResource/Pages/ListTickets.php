<?php

namespace App\Modules\Admin\Filament\Resources\TicketResource\Pages;

use App\Modules\Admin\Filament\Resources\TicketResource;
use Filament\Resources\Pages\ListRecords;

class ListTickets extends ListRecords
{
    protected static string $resource = TicketResource::class;
}
