<?php

namespace App\Modules\Admin\Filament\Widgets;

use App\Core\Models\Workspace;
use Filament\Widgets\ChartWidget;

class PlanDistributionWidget extends ChartWidget
{
    protected static ?string $heading = 'Plan Distribution';

    protected function getData(): array
    {
        $plans = Workspace::selectRaw('COALESCE(plan, \'free\') as plan, COUNT(*) as count')
            ->groupBy('plan')
            ->pluck('count', 'plan');

        return [
            'labels' => $plans->keys()->map(fn ($p) => ucfirst($p))->toArray(),
            'datasets' => [
                [
                    'data' => $plans->values()->toArray(),
                    'backgroundColor' => ['#6366f1', '#22c55e', '#eab308', '#f97316', '#ef4444'],
                ],
            ],
        ];
    }

    protected function getType(): string
    {
        return 'doughnut';
    }
}
