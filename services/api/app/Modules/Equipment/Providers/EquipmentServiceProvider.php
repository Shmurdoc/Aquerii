<?php

namespace App\Modules\Equipment\Providers;

use Illuminate\Support\ServiceProvider;

class EquipmentServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/equipment.php');
        if (file_exists($route)) {
            $this->loadRoutesFrom($route);
        }
    }
}
