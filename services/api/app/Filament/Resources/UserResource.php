<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Hash;

class UserResource extends Resource
{
    protected static ?string $model = User::class;
    protected static ?string $navigationIcon  = 'heroicon-o-users';
    protected static ?string $navigationGroup = 'Platform';
    protected static ?int    $navigationSort  = 2;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Section::make('Profile')->schema([
                Forms\Components\TextInput::make('name')
                    ->required()->maxLength(100),
                Forms\Components\TextInput::make('email')
                    ->email()->required()->unique(ignoreRecord: true),
                Forms\Components\FileUpload::make('avatar_url')
                    ->image()->directory('avatars')->label('Avatar'),
            ])->columns(2),

            Forms\Components\Section::make('Security')->schema([
                Forms\Components\TextInput::make('password')
                    ->password()
                    ->dehydrateStateUsing(fn($s) => Hash::make($s))
                    ->dehydrated(fn($s) => filled($s))
                    ->required(fn(string $context) => $context === 'create')
                    ->label('New Password'),
                Forms\Components\Toggle::make('email_verified')
                    ->label('Email Verified')
                    ->dehydrateStateUsing(fn($s) => $s ? now() : null)
                    ->afterStateHydrated(fn($c, $r) => $c->state(filled($r?->email_verified_at))),
                Forms\Components\Toggle::make('totp_enabled')->disabled()->label('MFA Enabled'),
            ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('avatar_url')->circular()->label(''),
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('email')->searchable(),
                Tables\Columns\IconColumn::make('email_verified_at')->boolean()->label('Verified'),
                Tables\Columns\IconColumn::make('totp_enabled')->boolean()->label('MFA'),
                Tables\Columns\TextColumn::make('workspaces_count')
                    ->counts('workspaces')->label('Workspaces'),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable()->toggleable(),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('email_verified_at')
                    ->nullable()
                    ->label('Email Verified'),
                Tables\Filters\TernaryFilter::make('totp_enabled')
                    ->label('MFA Enabled'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('suspend')
                    ->icon('heroicon-o-no-symbol')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->action(fn(User $record) => $record->tokens()->delete()),
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
            'index'  => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit'   => Pages\EditUser::route('/{record}/edit'),
        ];
    }
}
