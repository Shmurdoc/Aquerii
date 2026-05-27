<?php

namespace App\Modules\Admin\Filament\Pages;

use App\Core\Models\Workspace;
use Filament\Pages\Page;
use Filament\Tables;
use Filament\Tables\Table;

class StorageAnalytics extends Page implements Tables\Contracts\HasTable
{
    use Tables\Concerns\InteractsWithTable;

    protected static ?string $navigationIcon = 'heroicon-o-hard-drive';

    protected static ?string $navigationLabel = 'Storage Analytics';

    protected static ?string $navigationGroup = 'Monitoring';

    protected static ?int $navigationSort = 2;

    protected static string $view = 'filament::pages.dashboard';

    public function table(Table $table): Table
    {
        return $table
            ->query(Workspace::where('storage_used_bytes', '>', 0)->orderBy('storage_used_bytes', 'desc'))
            ->columns([
                Tables\Columns\TextColumn::make('name')->label('Workspace')->searchable(),
                Tables\Columns\TextColumn::make('plan')->badge(),
                Tables\Columns\TextColumn::make('storage_used_bytes')
                    ->label('Used')
                    ->formatStateUsing(fn ($state): string => $state ? round($state / 1024 / 1024, 1).' MB' : '0 MB')
                    ->sortable(),
                Tables\Columns\TextColumn::make('storage_quota_bytes')
                    ->label('Quota')
                    ->formatStateUsing(fn ($state): string => $state ? round($state / 1024 / 1024, 1).' MB' : 'Unlimited')
                    ->sortable(),
                Tables\Columns\TextColumn::make('storage_used_pct')
                    ->label('Utilization')
                    ->getStateUsing(fn (Workspace $record): float => $record->storage_quota_bytes > 0
                        ? round(($record->storage_used_bytes / $record->storage_quota_bytes) * 100, 1)
                        : 0)
                    ->suffix('%')
                    ->color(fn ($state): string => $state > 90 ? 'danger' : ($state > 70 ? 'warning' : 'success')),
            ])
            ->defaultSort('storage_used_bytes', 'desc');
    }
}
