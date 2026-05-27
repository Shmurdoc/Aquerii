<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkspaceUsage extends Model
{
    use HasUuids;

    protected $table = 'workspace_usage';

    protected $fillable = [
        'workspace_id', 'resource', 'used', 'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'used' => 'integer',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }
}
