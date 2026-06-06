<?php

namespace App\Modules\Competency\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class CompetencyServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/competency.php');
        if (file_exists($route)) {
            $this->loadRoutesFrom($route);
        }
    }
}
