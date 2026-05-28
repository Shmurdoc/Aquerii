<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class KeyResult extends Model
{
    use HasUuids;

    protected $table = 'key_results';

    protected $fillable = [
        'goal_id', 'title', 'description', 'target_value', 'current_value', 'unit', 'status', 'owner_id', 'position',
    ];

    protected function casts(): array
    {
        return [
            'target_value' => 'decimal:2',
            'current_value' => 'decimal:2',
        ];
    }

    public function goal()
    {
        return $this->belongsTo(Goal::class, 'goal_id');
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function getProgressAttribute(): float
    {
        return $this->target_value > 0
            ? min(100, round(($this->current_value / $this->target_value) * 100, 1))
            : 0;
    }

    public function scopeOnTrack($query)
    {
        return $query->where('status', 'on_track');
    }

    public function scopeAtRisk($query)
    {
        return $query->where('status', 'at_risk');
    }
}
