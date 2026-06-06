<?php

namespace App\Modules\Equipment\Models;

use App\Core\Models\Workspace;
use Database\Factories\Equipment\EquipmentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Equipment extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'equipment';

    protected $fillable = [
        'workspace_id', 'category_id', 'plant_number', 'name',
        'make', 'model', 'serial_number', 'year', 'location',
        'status', 'purchase_date', 'purchase_cost', 'warranty_expiry',
        'notes', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'purchase_date' => 'date',
            'warranty_expiry' => 'date',
            'purchase_cost' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    protected static function newFactory()
    {
        return EquipmentFactory::new();
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(EquipmentCategory::class, 'category_id');
    }

    public function inspections(): HasMany
    {
        return $this->hasMany(EquipmentInspection::class, 'equipment_id');
    }

    public function breakdowns(): HasMany
    {
        return $this->hasMany(EquipmentBreakdown::class, 'equipment_id');
    }

    public function maintenanceSchedules(): HasMany
    {
        return $this->hasMany(MaintenanceSchedule::class, 'equipment_id');
    }
}
