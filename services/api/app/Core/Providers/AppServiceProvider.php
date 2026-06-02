<?php

namespace App\Core\Providers;

use App\Core\Models\Board;
use App\Core\Models\Comment;
use App\Core\Models\Item;
use App\Core\Observers\BoardObserver;
use App\Core\Observers\CommentObserver;
use App\Core\Observers\ItemObserver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Model::shouldBeStrict(! app()->isProduction());

        Item::observe(ItemObserver::class);
        Board::observe(BoardObserver::class);
        Comment::observe(CommentObserver::class);

        // Core route files (Meetings, Reports) — always-on, not module-gated.
        // HR is loaded via require in routes/api.php inside the workspace group.
        $this->loadCoreRoutes();
    }

    private function loadCoreRoutes(): void
    {
        // Meetings routes are loaded here because they are not covered by api.php.
        // Reports routes are defined directly in routes/api.php inside the
        // auth:sanctum + throttle:60,1 group — do NOT load reports.php here as
        // it would create duplicate routes that bypass rate limiting.
        $coreRoutes = ['meetings'];

        foreach ($coreRoutes as $name) {
            $path = base_path("routes/modules/{$name}.php");
            if (file_exists($path)) {
                Route::middleware('api')->prefix('api')->group($path);
            }
        }
    }
}
