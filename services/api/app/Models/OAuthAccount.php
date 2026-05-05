<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class OAuthAccount extends Model
{
    use HasUuids;

    protected $table = 'oauth_accounts';

    protected $fillable = [
        'user_id', 'provider', 'provider_user_id',
        'access_token', 'refresh_token', 'token_expires_at',
    ];

    protected $hidden = ['access_token', 'refresh_token'];

    protected function casts(): array
    {
        return [
            'token_expires_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
