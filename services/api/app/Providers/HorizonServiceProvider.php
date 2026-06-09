<?php

namespace App\Providers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Laravel\Horizon\HorizonApplicationServiceProvider;

class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    public function gate(): void
    {
        // Only super admins can access Horizon dashboard
        Gate::define('viewHorizon', function ($user = null) {
            return $user && DB::connection('superadmin')
                ->table('superadmin.super_admins')
                ->where('user_id', $user->id)
                ->exists();
        });
    }
}
