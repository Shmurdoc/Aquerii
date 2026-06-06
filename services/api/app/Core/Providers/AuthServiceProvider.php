<?php

namespace App\Core\Providers;

use App\Core\Models\Board;
use App\Core\Models\Comment;
use App\Core\Models\File;
use App\Core\Models\Item;
use App\Core\Models\Workspace;
use App\Core\Policies\BoardPolicy;
use App\Core\Policies\CommentPolicy;
use App\Core\Policies\FilePolicy;
use App\Core\Policies\ItemPolicy;
use App\Core\Policies\WorkspacePolicy;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Policies\CrmDealPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Workspace::class => WorkspacePolicy::class,
        Item::class => ItemPolicy::class,
        File::class => FilePolicy::class,
        Comment::class => CommentPolicy::class,
        Board::class => BoardPolicy::class,
        CrmDeal::class => CrmDealPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
