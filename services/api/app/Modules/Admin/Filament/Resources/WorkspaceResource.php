<?php

namespace App\Modules\Admin\Filament\Resources;

use App\Core\Models\Workspace;
use App\Modules\Admin\Filament\Resources\WorkspaceResource\Pages;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class WorkspaceResource extends Resource
{
    protected static ?string $model = Workspace::class;

    protected static ?string $navigationIcon = 'heroicon-o-building-office-2';

    protected static ?string $navigationGroup = 'Platform';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Section::make('Identity')->schema([
                Forms\Components\TextInput::make('name')
                    ->required()->maxLength(100),
                Forms\Components\TextInput::make('slug')
                    ->required()->unique(ignoreRecord: true)->maxLength(100),
                Forms\Components\ColorPicker::make('color'),
            ])->columns(3),

            Forms\Components\Section::make('Billing')->schema([
                Forms\Components\Select::make('plan')
                    ->options(['free' => 'Free', 'starter' => 'Starter', 'growth' => 'Growth', 'business' => 'Business', 'enterprise' => 'Enterprise'])
                    ->required(),
                Forms\Components\Select::make('plan_status')
                    ->options(['active' => 'Active', 'trialing' => 'Trialing', 'past_due' => 'Past Due', 'cancelled' => 'Cancelled'])
                    ->default('active'),
                Forms\Components\TextInput::make('stripe_customer_id')->maxLength(255),
                Forms\Components\TextInput::make('stripe_subscription_id')->maxLength(255),
                Forms\Components\DateTimePicker::make('trial_ends_at'),
                Forms\Components\DateTimePicker::make('plan_expires_at'),
            ])->columns(2),

            Forms\Components\Section::make('Limits')->schema([
                Forms\Components\TextInput::make('seat_count')
                    ->numeric()->default(1),
                Forms\Components\TextInput::make('seat_quota')
                    ->numeric()->default(10),
                Forms\Components\TextInput::make('storage_quota_bytes')
                    ->numeric()->default(5368709120),
                Forms\Components\TextInput::make('storage_used_bytes')
                    ->numeric()->disabled(),
            ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('slug')->searchable(),
                Tables\Columns\TextColumn::make('plan')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'free' => 'gray',
                        'starter' => 'primary',
                        'growth' => 'success',
                        'business' => 'warning',
                        'enterprise' => 'danger',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('plan_status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'active' => 'success',
                        'trialing' => 'info',
                        'past_due' => 'danger',
                        'cancelled' => 'gray',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('seat_count')->label('Seats')->sortable(),
                Tables\Columns\TextColumn::make('members_count')
                    ->counts('members')->label('Members'),
                Tables\Columns\TextColumn::make('trial_ends_at')->dateTime()->sortable()->toggleable(),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable()->toggleable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('plan')
                    ->options(['free' => 'Free', 'starter' => 'Starter', 'growth' => 'Growth', 'business' => 'Business', 'enterprise' => 'Enterprise']),
                Tables\Filters\SelectFilter::make('plan_status')
                    ->options(['active' => 'Active', 'trialing' => 'Trialing', 'past_due' => 'Past Due', 'cancelled' => 'Cancelled']),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('override_plan')
                    ->label('Override Plan')
                    ->icon('heroicon-o-currency-dollar')
                    ->color('warning')
                    ->form([
                        Forms\Components\Select::make('plan')
                            ->label('New Plan')
                            ->options(['free' => 'Free', 'starter' => 'Starter', 'growth' => 'Growth', 'business' => 'Business', 'enterprise' => 'Enterprise'])
                            ->required(),
                        Forms\Components\TextInput::make('reason')
                            ->label('Reason')
                            ->required()
                            ->maxLength(500),
                    ])
                    ->action(function (array $data, Workspace $record) {
                        $record->update(['plan' => $data['plan']]);
                        Notification::make()
                            ->success()
                            ->title("Plan overridden to {$data['plan']}")
                            ->body("Reason: {$data['reason']}")
                            ->send();
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListWorkspaces::route('/'),
            'create' => Pages\CreateWorkspace::route('/create'),
            'edit' => Pages\EditWorkspace::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->withoutGlobalScopes();
    }
}
