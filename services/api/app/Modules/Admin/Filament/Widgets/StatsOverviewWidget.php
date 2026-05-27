<?php

namespace App\Modules\Admin\Filament\Widgets;

use App\Core\Models\Workspace;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverviewWidget extends BaseWidget
{
    protected function getColumns(): int
    {
        return 4;
    }

    protected function getStats(): array
    {
        $totalWorkspaces = Workspace::count();
        $activeWorkspaces = Workspace::whereIn('plan_status', ['active', 'trialing'])->count();
        $trialWorkspaces = Workspace::where('plan_status', 'trialing')->count();
        $totalUsers = \App\Core\Models\User::count();

        return [
            Stat::make('Total Workspaces', number_format($totalWorkspaces))
                ->description('Across all plans')
                ->color('primary'),

            Stat::make('Active', number_format($activeWorkspaces))
                ->description(($trialWorkspaces > 0 ? "{$trialWorkspaces} trialing" : 'All paid'))
                ->color('success'),

            Stat::make('Total Users', number_format($totalUsers))
                ->description('Platform-wide')
                ->color('info'),

            Stat::make('Avg Users/Workspace', $totalWorkspaces > 0
                ? number_format($totalUsers / $totalWorkspaces, 1)
                : '0')
                ->description('Seat utilization')
                ->color('warning'),
        ];
    }
}
