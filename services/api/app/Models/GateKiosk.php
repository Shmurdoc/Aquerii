<?php

namespace App\Models;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class GateKiosk extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'id', 'workspace_id', 'name', 'api_key', 'allowed_sites',
        'last_used_at', 'rotated_at',
    ];

    protected $hidden = [
        'api_key',
    ];

    protected function casts(): array
    {
        return [
            'allowed_sites' => 'array',
            'last_used_at' => 'datetime',
            'rotated_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }
}
