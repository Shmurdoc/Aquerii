<?php

namespace App\Modules\Templates\Providers;

use Illuminate\Support\ServiceProvider;

class TemplateServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/templates.php');
        if (file_exists($route)) {
            $this->loadRoutesFrom($route);
        }
    }
}
