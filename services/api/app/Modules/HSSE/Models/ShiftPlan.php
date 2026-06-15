<?php

namespace App\Modules\HSSE\Models;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftPlan extends Model
{
    use HasUuids;

    protected $table = 'shift_plans';

    protected $fillable = [
        'workspace_id',
        'date',
        'shift_type',
        'status',
        'roles',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'roles' => 'array',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }
}
