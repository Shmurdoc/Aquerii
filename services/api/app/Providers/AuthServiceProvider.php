<?php

namespace App\Providers;

use App\Core\Auth\GateKioskGuard;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Auth::extend('gate-kiosk', function ($app, $name, $config) {
            return new GateKioskGuard($app['request']);
        });
    }
}
