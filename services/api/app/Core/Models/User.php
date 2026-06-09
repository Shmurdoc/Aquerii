<?php

namespace App\Core\Models;

use App\Modules\CRM\Models\CrmCompany;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable, SoftDeletes;

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }

    protected $fillable = [
        'name', 'email', 'password_hash', 'avatar_url',
        'locale', 'timezone', 'two_factor_enabled',
        'email_verified_at', 'last_seen_at',
        'two_factor_secret', 'two_factor_recovery_codes',
        'notification_preferences', 'account_type',
    ];

    protected $hidden = [
        'password_hash', 'two_factor_secret', 'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'two_factor_enabled' => 'boolean',
            'last_seen_at' => 'datetime',
            'deleted_at' => 'datetime',
            'notification_preferences' => 'array',
        ];
    }

    public function workspaces()
    {
        return $this->belongsToMany(Workspace::class, 'workspace_members')
            ->withPivot('role', 'status', 'joined_at')
            ->wherePivot('status', 'active');
    }

    public function workspaceMembers()
    {
        return $this->hasMany(WorkspaceMember::class, 'user_id');
    }

    public function ownedCompanies()
    {
        return $this->hasMany(CrmCompany::class, 'owner_id');
    }

    public function oauthAccounts()
    {
        return $this->hasMany(OAuthAccount::class);
    }

    public function sessions()
    {
        return $this->hasMany(UserSession::class, 'user_id');
    }

    public function pushSubscriptions()
    {
        return $this->hasMany(PushSubscription::class, 'user_id');
    }
}
