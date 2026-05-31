<?php

namespace App\Modules\JobCards\Providers;

use Illuminate\Support\ServiceProvider;

class JobCardsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/jobcards.php');
        if (file_exists($route)) {
            $this->loadRoutesFrom($route);
        }
    }
}
