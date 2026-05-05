<?php
namespace App\Filament\Resources;

use Filament\Resources\Resource;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class AuditLogResource extends Resource
{
    protected static ?string $model = \stdClass::class;
    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';
    protected static ?string $navigationLabel = 'Audit Log';

    public static function canCreate(): bool { return false; }

    public static function table(Table $table): Table
    {
        return $table
            ->query(fn () => \Illuminate\Database\Eloquent\Model::resolveConnection('pgsql')->table('superadmin.super_admin_audit_log')->orderByDesc('created_at'))
            ->columns([
                TextColumn::make('admin_id')->label('Admin'),
                TextColumn::make('action')->searchable(),
                TextColumn::make('target_type'),
                TextColumn::make('ip_address'),
                TextColumn::make('created_at')->dateTime()->sortable(),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => Pages\ListAuditLogs::route('/')];
    }
}
