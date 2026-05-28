<?php

namespace App\Modules\Support\Providers;

use App\Modules\Support\Events\TicketResolved;
use App\Modules\Support\Listeners\GenerateKbFromTicket;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class SupportServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/support.php');
        if (file_exists($route)) {
            Route::middleware('api')->prefix('api')->group(function () use ($route) {
                $this->app->make('files')->requireOnce($route);
            });
        }

        Event::listen(TicketResolved::class, GenerateKbFromTicket::class);
    }
}
