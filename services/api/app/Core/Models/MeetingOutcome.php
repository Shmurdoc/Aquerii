<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MeetingOutcome extends Model
{
    use HasUuids;

    protected $table = 'meeting_outcomes';

    protected $fillable = [
        'meeting_id', 'workspace_id', 'decisions', 'action_items',
        'effectiveness_score', 'notes', 'linked_goal_id',
    ];

    protected function casts(): array
    {
        return [
            'decisions' => 'array',
            'action_items' => 'array',
            'effectiveness_score' => 'integer',
        ];
    }

    public function meeting()
    {
        return $this->belongsTo(Meeting::class, 'meeting_id');
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function linkedGoal()
    {
        return $this->belongsTo(Goal::class, 'linked_goal_id');
    }
}
