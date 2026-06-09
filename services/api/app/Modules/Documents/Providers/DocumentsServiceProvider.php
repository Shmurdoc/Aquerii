<?php

namespace App\Modules\Documents\Providers;

use App\Core\Http\Middleware\InternalSecret;
use App\Modules\Documents\Http\Controllers\DocumentYdocController;
use App\Modules\Documents\Http\Controllers\InternalScannedDocumentController;
use App\Modules\Documents\Models\Document;
use App\Modules\Documents\Observers\DocumentObserver;
use App\Modules\Documents\Policies\DocumentPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class DocumentsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Document routes are loaded via api.php inside the workspaces/{workspace} prefix group.
        // Only load internal routes here (not workspace-scoped).

        Route::middleware('api')->prefix('api')->group(function () {
            Route::prefix('internal')->middleware(InternalSecret::class)->group(function () {
                Route::get('documents/{id}/ydoc', [DocumentYdocController::class, 'show']);
                Route::put('documents/{id}/ydoc', [DocumentYdocController::class, 'update']);
                Route::get('scanned-documents/{id}/content', [InternalScannedDocumentController::class, 'content']);
            });
        });

        Document::observe(DocumentObserver::class);
        Gate::policy(Document::class, DocumentPolicy::class);
    }
}
