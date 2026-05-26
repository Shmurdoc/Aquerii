<?php

namespace App\Modules\Admin\Providers;

use App\Modules\Admin\Providers\Filament\AdminPanelProvider;
use Illuminate\Support\ServiceProvider;

class AdminServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->register(AdminPanelProvider::class);
    }

    public function boot(): void {}
}
