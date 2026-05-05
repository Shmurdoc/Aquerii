<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FeatureFlagResource\Pages;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

// Lightweight Eloquent-free model backed by superadmin.feature_flags
class FeatureFlagResource extends Resource
{
    protected static ?string $model = \App\Models\FeatureFlag::class;
    protected static ?string $navigationIcon  = 'heroicon-o-flag';
    protected static ?string $navigationGroup = 'Platform';
    protected static ?int    $navigationSort  = 3;
    protected static ?string $label           = 'Feature Flag';

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('key')
                ->required()->maxLength(100)
                ->disabled(fn(string $context) => $context === 'edit'),
            Forms\Components\Toggle::make('enabled')
                ->required()->default(false),
            Forms\Components\Textarea::make('description')
                ->rows(2)->maxLength(500),
            Forms\Components\TagsInput::make('workspace_ids')
                ->label('Limit to Workspace IDs (leave empty = global)')
                ->placeholder('uuid'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('key')->searchable()->sortable(),
                Tables\Columns\IconColumn::make('enabled')->boolean(),
                Tables\Columns\TextColumn::make('description')->limit(60)->toggleable(),
                Tables\Columns\TextColumn::make('updated_at')->dateTime()->sortable(),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('enabled'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
                Tables\Actions\Action::make('toggle')
                    ->icon('heroicon-o-arrow-path')
                    ->action(fn(Model $record) => $record->update(['enabled' => ! $record->enabled])),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListFeatureFlags::route('/'),
            'create' => Pages\CreateFeatureFlag::route('/create'),
            'edit'   => Pages\EditFeatureFlag::route('/{record}/edit'),
        ];
    }
}
