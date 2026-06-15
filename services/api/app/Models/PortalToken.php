<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PortalToken extends Model
{
    use HasUuids;

    protected $table = 'portal_tokens';

    protected $fillable = [
        'workspace_id', 'token', 'expires_at', 'used_at', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
            'metadata' => 'array',
        ];
    }
}
