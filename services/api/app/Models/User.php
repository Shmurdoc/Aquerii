<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasUuids, HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'email', 'password_hash', 'avatar_url',
        'locale', 'timezone', 'two_factor_enabled',
    ];

    protected $hidden = [
        'password_hash', 'two_factor_secret', 'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'  => 'datetime',
            'two_factor_enabled' => 'boolean',
            'last_seen_at'       => 'datetime',
            'deleted_at'         => 'datetime',
        ];
    }

    public function workspaces()
    {
        return $this->belongsToMany(Workspace::class, 'workspace_members')
            ->withPivot('role', 'status', 'joined_at')
            ->wherePivot('status', 'active');
    }

    public function oauthAccounts()
    {
        return $this->hasMany(OauthAccount::class);
    }
}
