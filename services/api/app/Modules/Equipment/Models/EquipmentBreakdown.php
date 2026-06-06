<?php

namespace App\Modules\Equipment\Models;

use App\Core\Models\Workspace;
use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentBreakdown extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function newFactory()
    {
        return \Database\Factories\Equipment\EquipmentBreakdownFactory::new();
    }

    protected $table = 'equipment_breakdowns';

    protected $fillable = [
        'workspace_id', 'equipment_id', 'reported_by', 'job_card_id',
        'description', 'root_cause', 'action_taken', 'downtime_minutes',
        'status', 'reported_at', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'reported_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
