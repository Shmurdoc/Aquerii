<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkspaceInvitation extends Model
{
    use HasUuids;

    protected $fillable = [
        'workspace_id',
        'email',
        'role',
        'token',
        'invited_by',
        'accepted_at',
        'expires_at',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
        'expires_at'  => 'datetime',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function isPending(): bool
    {
        return is_null($this->accepted_at) && $this->expires_at->isFuture();
    }
}
