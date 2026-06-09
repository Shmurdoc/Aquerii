<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Model;
use App\Models\Item;
use App\Models\Board;
use App\Models\Document;
use App\Models\Comment;
use App\Observers\ItemObserver;
use App\Observers\BoardObserver;
use App\Observers\DocumentObserver;
use App\Observers\CommentObserver;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Model::shouldBeStrict(! app()->isProduction());

        Item::observe(ItemObserver::class);
        Board::observe(BoardObserver::class);
        Document::observe(DocumentObserver::class);
        Comment::observe(CommentObserver::class);
    }
}
