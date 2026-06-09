<?php

namespace App\Modules\Admin\Filament\Pages;

use App\Modules\Email\Models\EmailAccount;
use Filament\Pages\Page;
use Filament\Tables;
use Filament\Tables\Table;

class EmailAnalytics extends Page implements Tables\Contracts\HasTable
{
    use Tables\Concerns\InteractsWithTable;

    protected static ?string $navigationIcon = 'heroicon-o-envelope';

    protected static ?string $navigationLabel = 'Email Analytics';

    protected static ?string $navigationGroup = 'Monitoring';

    protected static ?int $navigationSort = 1;

    protected static string $view = 'filament::pages.dashboard';

    public function table(Table $table): Table
    {
        return $table
            ->query(EmailAccount::query()->with('workspace'))
            ->columns([
                Tables\Columns\TextColumn::make('workspace.name')->label('Workspace')->searchable(),
                Tables\Columns\TextColumn::make('email')->searchable(),
                Tables\Columns\TextColumn::make('provider')->badge(),
                Tables\Columns\IconColumn::make('is_verified')->boolean(),
                Tables\Columns\TextColumn::make('last_sync_at')->label('Last Sync')->since(),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('provider')
                    ->options(['gmail' => 'Gmail', 'outlook' => 'Outlook', 'imap' => 'IMAP', 'smtp' => 'SMTP']),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
