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

        // Core route files (HR, Meetings, Reports) — always-on, not module-gated
        $this->loadCoreRoutes();
    }

    private function loadCoreRoutes(): void
    {
        $coreRoutes = ['hr', 'meetings', 'reports'];

        foreach ($coreRoutes as $name) {
            $path = base_path("routes/modules/{$name}.php");
            if (file_exists($path)) {
                Route::middleware('api')->prefix('api')->group($path);
            }
        }
    }
}
