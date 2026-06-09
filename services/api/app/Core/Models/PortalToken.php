<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortalToken extends Model
{
    use HasUuids;

    const UPDATED_AT = null;

    protected $table = 'portal_tokens';

    protected $fillable = [
        'workspace_id', 'label', 'token_hash', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function isValid(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isFuture();
    }
}
