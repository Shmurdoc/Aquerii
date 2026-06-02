<?php

namespace App\Modules\HSSE\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class HSSEProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/hsse.php');
        if (file_exists($route)) {
            Route::middleware('api')->prefix('api')->group(function () use ($route) {
                require $route;
            });
        }
    }
}
