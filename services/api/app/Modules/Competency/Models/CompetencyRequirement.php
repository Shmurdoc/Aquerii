<?php

namespace App\Modules\Competency\Models;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CompetencyRequirement extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'competency_requirements';

    protected $fillable = [
        'workspace_id', 'requirable_type', 'requirable_id', 'competency_type_id',
        'is_mandatory', 'expiry_alert_days', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_mandatory' => 'boolean',
            'expiry_alert_days' => 'integer',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function competencyType(): BelongsTo
    {
        return $this->belongsTo(CompetencyType::class, 'competency_type_id');
    }

    public function requirable()
    {
        return $this->morphTo();
    }
}
