<?php

namespace App\Modules\Automation\Providers;

use App\Modules\Automation\Console\ImportAgencyAgentTemplates;
use App\Modules\Automation\Console\ImportAgentTemplates;
use App\Modules\Automation\Models\Automation;
use App\Modules\Automation\Policies\AutomationPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AutomationServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $route = base_path('routes/modules/automation.php');
        if (file_exists($route)) {
            Route::middleware('api')->prefix('api')->group(function () use ($route) {
                $this->app->make('files')->requireOnce($route);
            });
        }

        Gate::policy(Automation::class, AutomationPolicy::class);

        if ($this->app->runningInConsole()) {
            $this->commands([
                ImportAgentTemplates::class,
                ImportAgencyAgentTemplates::class,
            ]);
        }
    }
}
