<?php

namespace App\Modules\Equipment\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Database\Factories\Equipment\EquipmentInspectionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EquipmentInspection extends Model
{
    use HasFactory, HasUuids;

    protected static function newFactory()
    {
        return EquipmentInspectionFactory::new();
    }

    protected $table = 'equipment_inspections';

    protected $fillable = [
        'workspace_id', 'equipment_id', 'inspected_by', 'shift',
        'status', 'notes', 'inspected_at',
    ];

    protected function casts(): array
    {
        return [
            'inspected_at' => 'datetime',
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

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(EquipmentInspectionItem::class, 'inspection_id');
    }
}
