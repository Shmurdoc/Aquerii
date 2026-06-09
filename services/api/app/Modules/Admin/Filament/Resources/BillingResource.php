<?php

namespace App\Modules\Admin\Filament\Resources;

use App\Core\Models\BillingEvent;
use App\Modules\Admin\Filament\Resources\BillingResource\Pages;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class BillingResource extends Resource
{
    protected static ?string $model = BillingEvent::class;

    protected static ?string $navigationIcon = 'heroicon-o-currency-dollar';

    protected static ?string $navigationGroup = 'Platform';

    protected static ?int $navigationSort = 4;

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('workspace.name')
                    ->label('Workspace')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('event_type')
                    ->badge()
                    ->searchable(),
                Tables\Columns\TextColumn::make('processor')
                    ->badge()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('amount_cents')
                    ->label('Amount')
                    ->formatStateUsing(fn ($state): string => '$'.number_format(($state ?: 0) / 100, 2))
                    ->sortable(),
                Tables\Columns\TextColumn::make('currency'),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime()
                    ->sortable()
                    ->since(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('processor')
                    ->options(['stripe' => 'Stripe', 'payfast' => 'PayFast']),
                Tables\Filters\SelectFilter::make('event_type')
                    ->options([
                        'payment_succeeded' => 'Payment Succeeded',
                        'payment_failed' => 'Payment Failed',
                        'subscription_created' => 'Subscription Created',
                        'subscription_updated' => 'Subscription Updated',
                        'subscription_cancelled' => 'Subscription Cancelled',
                        'invoice_created' => 'Invoice Created',
                        'invoice_paid' => 'Invoice Paid',
                    ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListBillingEvents::route('/'),
        ];
    }
}
