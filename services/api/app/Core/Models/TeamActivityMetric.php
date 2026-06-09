<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TeamActivityMetric extends Model
{
    use HasUuids;

    protected $table = 'team_activity_metrics';

    protected $fillable = [
        'workspace_id', 'user_id', 'date',
        'active_hours', 'messages_sent', 'messages_received', 'avg_response_time_minutes',
        'tasks_assigned', 'tasks_completed', 'tasks_overdue',
        'estimated_hours_total', 'tracked_hours_total',
        'sentiment_score', 'positive_messages', 'negative_messages',
        'late_night_sessions', 'weekend_sessions', 'flagged',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'estimated_hours_total' => 'decimal:2',
            'tracked_hours_total' => 'decimal:2',
            'sentiment_score' => 'decimal:2',
            'flagged' => 'boolean',
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

    public function scopeForDate($query, $date)
    {
        return $query->where('date', $date);
    }

    public function scopeForDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }
}
