<?php
namespace App\Filament\Resources;

use App\Filament\Resources\WorkspaceResource\Pages;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Actions\ViewAction;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class WorkspaceResource extends Resource
{
    protected static ?string $model = \stdClass::class; // Raw DB queries via ClickHouse
    protected static ?string $navigationIcon = 'heroicon-o-building-office';
    protected static ?string $navigationLabel = 'Workspaces';

    public static function table(Table $table): Table
    {
        return $table
            ->query(fn (): Builder => \Illuminate\Database\Eloquent\Model::resolveConnection('pgsql')
                ->table('workspaces')->select('id', 'name', 'slug', 'plan', 'created_at', 'is_suspended')
            )
            ->columns([
                TextColumn::make('name')->searchable()->sortable(),
                TextColumn::make('slug')->searchable(),
                TextColumn::make('plan')->badge()->color(fn ($state) => match ($state) {
                    'enterprise' => 'success',
                    'pro'        => 'info',
                    'standard'   => 'warning',
                    default      => 'gray',
                }),
                TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->filters([
                SelectFilter::make('plan')->options(['free' => 'Free', 'standard' => 'Standard', 'pro' => 'Pro', 'enterprise' => 'Enterprise']),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => Pages\ListWorkspaces::route('/')];
    }
}
