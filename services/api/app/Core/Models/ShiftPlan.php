<?php

namespace App\Core\Models;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ShiftPlan extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'shift_plans';

    protected $fillable = [
        'workspace_id', 'date', 'shift_type',
        'required_roles', 'status',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'required_roles' => 'array',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ShiftPlanAssignment::class, 'shift_plan_id');
    }
}
