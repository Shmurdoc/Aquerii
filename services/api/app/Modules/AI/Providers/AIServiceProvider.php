<?php

namespace App\Modules\AI\Providers;

use Illuminate\Support\ServiceProvider;

class AIServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // routes/modules/ai.php is intentionally empty — all AI routes are loaded
        // via routes/api.php inside the authenticated workspace-scoped group with
        // feature:module.ai middleware. Do NOT load them here unauthenticated.
    }
}
