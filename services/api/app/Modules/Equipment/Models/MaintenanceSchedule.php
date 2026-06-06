<?php

namespace App\Modules\Equipment\Models;

use App\Core\Models\Workspace;
use App\Modules\JobCards\Models\JobCardTemplate;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MaintenanceSchedule extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function newFactory()
    {
        return \Database\Factories\Equipment\MaintenanceScheduleFactory::new();
    }

    protected $table = 'equipment_maintenance_schedules';

    protected $fillable = [
        'workspace_id', 'equipment_id', 'name',
        'frequency_type', 'frequency_value', 'trigger_type',
        'last_performed_at', 'next_due_at', 'last_meter_reading',
        'template_id', 'is_active', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'last_performed_at' => 'datetime',
            'next_due_at' => 'datetime',
            'is_active' => 'boolean',
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

    public function template(): BelongsTo
    {
        return $this->belongsTo(JobCardTemplate::class, 'template_id');
    }
}
