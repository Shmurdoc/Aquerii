<?php

namespace App\Core\Models;

use App\Core\Models\Workspace;
use App\Core\Models\User;
use App\Core\Models\Shift;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftAssignment extends Model
{
    use HasFactory, HasUuids;

    protected static function newFactory()
    {
        return \Database\Factories\ShiftAssignmentFactory::new();
    }

    protected $table = 'shift_assignments';

    protected $fillable = [
        'workspace_id', 'shift_id', 'user_id', 'date',
        'status', 'clocked_in_at', 'clocked_out_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'clocked_in_at' => 'datetime',
            'clocked_out_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class, 'shift_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
