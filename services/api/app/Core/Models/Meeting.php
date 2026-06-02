<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Meeting extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'meetings';

    protected $fillable = [
        'workspace_id', 'title', 'description', 'location', 'meeting_url',
        'starts_at', 'ends_at', 'status', 'organizer_id',
        'provider', 'provider_meeting_id', 'recurrence_rule',
        'parent_meeting_id', 'settings',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'settings' => 'array',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function organizer()
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function attendees()
    {
        return $this->hasMany(MeetingAttendee::class);
    }
}
