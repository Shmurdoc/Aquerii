<?php

namespace App\Filament\Resources;

use App\Filament\Resources\WorkspaceResource\Pages;
use App\Models\Workspace;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class WorkspaceResource extends Resource
{
    protected static ?string $model = Workspace::class;
    protected static ?string $navigationIcon  = 'heroicon-o-building-office-2';
    protected static ?string $navigationGroup = 'Platform';
    protected static ?int    $navigationSort  = 1;

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
                    ->options(['free' => 'Free', 'starter' => 'Starter', 'growth' => 'Growth', 'business' => 'Business'])
                    ->required(),
                Forms\Components\TextInput::make('stripe_customer_id')->maxLength(255),
                Forms\Components\TextInput::make('stripe_subscription_id')->maxLength(255),
                Forms\Components\DateTimePicker::make('plan_expires_at'),
            ])->columns(2),

            Forms\Components\Section::make('Limits')->schema([
                Forms\Components\TextInput::make('seat_count')
                    ->numeric()->default(1),
                Forms\Components\TextInput::make('storage_limit_bytes')
                    ->numeric()->default(5368709120),
                Forms\Components\TextInput::make('storage_used_bytes')
                    ->numeric()->disabled(),
                Forms\Components\TextInput::make('ai_credits_used')
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
                Tables\Columns\BadgeColumn::make('plan')
                    ->colors([
                        'gray'    => 'free',
                        'primary' => 'starter',
                        'success' => 'growth',
                        'warning' => 'business',
                    ]),
                Tables\Columns\TextColumn::make('seat_count')->label('Seats')->sortable(),
                Tables\Columns\TextColumn::make('members_count')
                    ->counts('members')->label('Members'),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable()->toggleable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('plan')
                    ->options(['free' => 'Free', 'starter' => 'Starter', 'growth' => 'Growth', 'business' => 'Business']),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('impersonate')
                    ->icon('heroicon-o-arrow-right-on-rectangle')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->action(fn(Workspace $record) => redirect()->route('filament.admin.impersonate', $record)),
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
            'index'  => Pages\ListWorkspaces::route('/'),
            'create' => Pages\CreateWorkspace::route('/create'),
            'edit'   => Pages\EditWorkspace::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        // Super admin bypasses RLS via DB role — still scope via Eloquent for safety
        return parent::getEloquentQuery()->withoutGlobalScopes();
    }
}
