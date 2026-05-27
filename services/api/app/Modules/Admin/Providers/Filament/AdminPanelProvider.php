<?php

namespace App\Modules\Admin\Providers\Filament;

use App\Modules\Admin\Filament\Pages\Dashboard;
use App\Modules\Admin\Filament\Resources\AuditLogResource;
use App\Modules\Admin\Filament\Resources\FeatureFlagResource;
use App\Modules\Admin\Filament\Resources\UserResource;
use App\Modules\Admin\Filament\Resources\WorkspaceResource;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->colors(['primary' => Color::Indigo])
            ->brandName('Aquerii Admin')
            ->authGuard('super_admins')
            ->resources([
                WorkspaceResource::class,
                UserResource::class,
                FeatureFlagResource::class,
                AuditLogResource::class,
            ])
            ->pages([
                Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Modules/Admin/Filament/Widgets'), for: 'App\\Modules\\Admin\\Filament\\Widgets')
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
