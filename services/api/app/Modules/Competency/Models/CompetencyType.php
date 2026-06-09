<?php

namespace App\Modules\Competency\Models;

use App\Core\Models\Workspace;
use Database\Factories\Competency\CompetencyTypeFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CompetencyType extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function newFactory()
    {
        return CompetencyTypeFactory::new();
    }

    protected $table = 'competency_types';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'category', 'issuing_body',
        'is_cof', 'requires_renewal', 'renewal_period_days', 'color', 'icon',
    ];

    protected function casts(): array
    {
        return [
            'is_cof' => 'boolean',
            'requires_renewal' => 'boolean',
            'renewal_period_days' => 'integer',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function records(): HasMany
    {
        return $this->hasMany(CompetencyRecord::class, 'competency_type_id');
    }

    public function requirements(): HasMany
    {
        return $this->hasMany(CompetencyRequirement::class, 'competency_type_id');
    }

    public function trainingRecords(): HasMany
    {
        return $this->hasMany(TrainingRecord::class, 'competency_type_id');
    }
}
