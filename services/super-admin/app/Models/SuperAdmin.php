<?php
namespace App\Models;

use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Foundation\Auth\User as Authenticatable;

class SuperAdmin extends Authenticatable implements FilamentUser
{
    protected $connection = 'superadmin';
    protected $table = 'superadmin.super_admins';

    protected $fillable = ['name', 'email', 'password', 'totp_secret', 'totp_enabled', 'last_login_at', 'last_login_ip'];

    protected $hidden = ['password', 'totp_secret'];

    protected $casts = [
        'totp_enabled'  => 'boolean',
        'last_login_at' => 'datetime',
    ];

    public function canAccessPanel(Panel $panel): bool
    {
        return true; // Access controlled by the superadmin DB role
    }
}
