<?php

namespace App\Modules\PTW\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class PTWProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/ptw.php');
        if (file_exists($route)) {
            Route::middleware('api')->prefix('api')->group(function () use ($route) {
                require $route;
            });
        }
    }
}
