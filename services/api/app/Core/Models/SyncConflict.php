<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SyncConflict extends Model
{
    use HasUuids;

    protected $table = 'sync_conflicts';

    protected $fillable = [
        'workspace_id', 'user_id', 'entity_type', 'entity_id',
        'operation', 'local_data', 'server_data',
        'resolution', 'merged_data', 'resolution_notes', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'local_data' => 'array',
            'server_data' => 'array',
            'merged_data' => 'array',
            'resolved_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeUnresolved($query)
    {
        return $query->whereNull('resolution');
    }

    public function scopeForEntity($query, string $type, string $id)
    {
        return $query->where('entity_type', $type)->where('entity_id', $id);
    }
}
