<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MeetingAttendee extends Model
{
    use HasUuids;

    protected $table = 'meeting_attendees';

    protected $fillable = [
        'meeting_id', 'user_id', 'email', 'name', 'status', 'required', 'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'required'     => 'boolean',
            'responded_at' => 'datetime',
        ];
    }

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }
}
