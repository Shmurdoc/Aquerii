<?php

namespace App\Modules\Equipment\Models;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentCategory extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function newFactory()
    {
        return \Database\Factories\Equipment\EquipmentCategoryFactory::new();
    }

    protected $table = 'equipment_categories';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'color', 'icon',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function equipment(): HasMany
    {
        return $this->hasMany(Equipment::class, 'category_id');
    }
}
