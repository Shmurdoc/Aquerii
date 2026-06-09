<?php

namespace App\Providers;

use App\Models\Board;
use App\Models\Comment;
use App\Models\Document;
use App\Models\Item;
use App\Observers\BoardObserver;
use App\Observers\CommentObserver;
use App\Observers\DocumentObserver;
use App\Observers\ItemObserver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

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
