<?php

namespace App\Modules\Equipment\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentInspectionItem extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'equipment_inspection_items';

    protected $fillable = [
        'inspection_id', 'item_name', 'passed', 'notes', 'position',
    ];

    protected function casts(): array
    {
        return [
            'passed' => 'boolean',
        ];
    }

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(EquipmentInspection::class, 'inspection_id');
    }
}
