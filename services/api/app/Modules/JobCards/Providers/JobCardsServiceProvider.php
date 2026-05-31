<?php

namespace App\Modules\JobCards\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class JobCardsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/jobcards.php');
        if (file_exists($route)) {
            Route::middleware('api')->prefix('api')->group(function () use ($route) {
                $this->app->make('files')->requireOnce($route);
            });
        }
    }
}
