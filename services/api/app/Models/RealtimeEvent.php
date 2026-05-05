<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class RealtimeEvent extends Model
{
    use HasUuids;

    protected $table = 'realtime_events';

    public $timestamps = false;

    protected $fillable = [
        'workspace_id', 'room', 'sequence', 'event_type', 'payload', 'published_at',
    ];

    protected function casts(): array
    {
        return [
            'payload'      => 'array',
            'published_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::deleting(function () {
            throw new RuntimeException('RealtimeEvent records are insert-only and cannot be deleted.');
        });
    }

    public function delete(): bool|null
    {
        throw new RuntimeException('RealtimeEvent records are insert-only and cannot be deleted.');
    }
}
