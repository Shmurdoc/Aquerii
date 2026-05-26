<?php

namespace App\Modules\Email\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class EmailServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/email.php');
        if (file_exists($route)) {
            Route::middleware('api')->prefix('api')->group(function () use ($route) {
                $this->app->make('files')->requireOnce($route);
            });
        }
    }
}
