<?php

namespace App\Providers;

use Laravel\Horizon\HorizonApplicationServiceProvider;

class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    public function gate(): void
    {
        // Only super admins can access Horizon dashboard
        \Illuminate\Support\Facades\Gate::define('viewHorizon', function ($user = null) {
            return $user && \Illuminate\Support\Facades\DB::connection('superadmin')
                ->table('superadmin.super_admins')
                ->where('user_id', $user->id)
                ->exists();
        });
    }
}
