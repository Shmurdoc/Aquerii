<?php

namespace App\Core\Models;

use App\Core\Models\Workspace;
use App\Core\Models\ShiftPlan;
use App\Core\Models\WorkspaceMember;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ShiftPlanAssignment extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'shift_plan_assignments';

    protected $fillable = [
        'workspace_id', 'shift_plan_id', 'worker_id',
        'role', 'status', 'checked_in_at',
    ];

    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function shiftPlan(): BelongsTo
    {
        return $this->belongsTo(ShiftPlan::class, 'shift_plan_id');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(WorkspaceMember::class, 'worker_id');
    }
}
