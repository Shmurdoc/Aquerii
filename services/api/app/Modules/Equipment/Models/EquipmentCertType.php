<?php

namespace App\Modules\Equipment\Models;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentCertType extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'equipment_cert_types';

    protected $fillable = [
        'workspace_id', 'name', 'slug', 'description', 'is_mandatory', 'frequency_days',
    ];

    protected function casts(): array
    {
        return [
            'is_mandatory' => 'boolean',
            'frequency_days' => 'integer',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function records(): HasMany
    {
        return $this->hasMany(EquipmentCertRecord::class, 'equipment_cert_type_id');
    }
}
