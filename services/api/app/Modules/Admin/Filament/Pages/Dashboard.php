<?php

namespace App\Modules\Admin\Filament\Pages;

use App\Modules\Admin\Filament\Widgets\PlanDistributionWidget;
use App\Modules\Admin\Filament\Widgets\StatsOverviewWidget;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    protected static ?string $navigationIcon = 'heroicon-o-home';
    protected static ?string $navigationLabel = 'Dashboard';
    protected static ?int $navigationSort = -1;

    protected function getHeaderWidgets(): array
    {
        return [
            StatsOverviewWidget::class,
            PlanDistributionWidget::class,
        ];
    }
}
