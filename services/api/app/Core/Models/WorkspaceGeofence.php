<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkspaceGeofence extends Model
{
    use HasUuids;

    protected $table = 'workspace_geofences';

    protected $fillable = [
        'workspace_id',
        'name',
        'lat',
        'lng',
        'radius_meters',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            'radius_meters' => 'decimal:2',
            'active' => 'boolean',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }
}
