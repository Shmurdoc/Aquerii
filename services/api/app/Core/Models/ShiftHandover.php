<?php

namespace App\Core\Models;

use App\Core\Models\Workspace;
use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftHandover extends Model
{
    use HasFactory, HasUuids;

    protected static function newFactory()
    {
        return \Database\Factories\ShiftHandoverFactory::new();
    }

    protected $table = 'shift_handovers';

    protected $fillable = [
        'workspace_id', 'from_assignment_id', 'to_assignment_id',
        'departing_user_id', 'incoming_user_id',
        'departing_notes', 'incoming_notes',
        'departing_signed_at', 'incoming_acknowledged_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'departing_signed_at' => 'datetime',
            'incoming_acknowledged_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function departingUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'departing_user_id');
    }

    public function incomingUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'incoming_user_id');
    }
}
