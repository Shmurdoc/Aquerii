<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class OAuthAccount extends Model
{
    use HasUuids;

    protected $table = 'oauth_accounts';

    protected $fillable = [
        'user_id', 'provider', 'provider_id',
        'access_token', 'refresh_token', 'expires_at',
    ];

    protected $hidden = ['access_token', 'refresh_token'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function decryptedAccessToken(): ?string
    {
        if (! $this->access_token) {
            return null;
        }

        try {
            return Crypt::decryptString($this->access_token);
        } catch (\Throwable) {
            try {
                // Backward compatibility for tokens encrypted via encrypt().
                return (string) Crypt::decrypt($this->access_token);
            } catch (\Throwable) {
                // Backward compatibility for plaintext tokens from older records.
                return $this->access_token;
            }
        }
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
