<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Goal extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'goals';

    protected $fillable = [
        'workspace_id', 'title', 'description', 'timeframe', 'status', 'owner_id', 'position',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function keyResults()
    {
        return $this->hasMany(KeyResult::class, 'goal_id');
    }

    public function meetingOutcomes()
    {
        return $this->hasMany(MeetingOutcome::class, 'linked_goal_id');
    }

    public function getProgressAttribute(): float
    {
        $keyResults = $this->keyResults;
        if ($keyResults->isEmpty()) return 0;

        return round($keyResults->avg(function ($kr) {
            return $kr->target_value > 0
                ? min(100, ($kr->current_value / $kr->target_value) * 100)
                : 0;
        }), 1);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForTimeframe($query, string $timeframe)
    {
        return $query->where('timeframe', $timeframe);
    }
}
