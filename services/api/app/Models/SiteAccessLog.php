<?php

namespace App\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Equipment\Models\Equipment;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SiteAccessLog extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'id', 'workspace_id', 'worker_id', 'equipment_id', 'direction', 'timestamp',
        'method', 'compliance_snapshot', 'override_reason', 'override_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'compliance_snapshot' => 'array',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(WorkspaceMember::class, 'worker_id');
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function overrideBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'override_by_user_id');
    }
}
