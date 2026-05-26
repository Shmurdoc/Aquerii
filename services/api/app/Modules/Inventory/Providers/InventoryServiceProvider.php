<?php

namespace App\Modules\Inventory\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class InventoryServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/inventory.php');
        if (file_exists($route)) {
            Route::middleware('api')->prefix('api')->group(function () use ($route) {
                $this->app->make('files')->requireOnce($route);
            });
        }
    }
}
