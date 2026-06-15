<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    use HasUuids;

    protected $table = 'attendance_logs';

    protected $fillable = [
        'workspace_id',
        'user_id',
        'clocked_in_at',
        'clocked_out_at',
        'clocked_in_lat',
        'clocked_in_lng',
        'clocked_out_lat',
        'clocked_out_lng',
        'clock_out_source',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'clocked_in_at' => 'datetime',
            'clocked_out_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
