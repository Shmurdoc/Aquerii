<?php

namespace App\Modules\CRM\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class CrmServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/crm.php');
        if (file_exists($route)) {
            $this->loadRoutesFromApiGroup($route);
        }
    }

    private function loadRoutesFromApiGroup(string $routeFile): void
    {
        Route::middleware('api')->prefix('api')->group(function () use ($routeFile) {
            $this->app->make('files')->requireOnce($routeFile);
        });
    }
}
