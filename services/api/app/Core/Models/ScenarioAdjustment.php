<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ScenarioAdjustment extends Model
{
    use HasUuids;

    protected $table = 'scenario_adjustments';

    protected $fillable = [
        'scenario_id', 'adjustment_type', 'parameters', 'description', 'position',
    ];

    protected function casts(): array
    {
        return [
            'parameters' => 'array',
        ];
    }

    public function scenario()
    {
        return $this->belongsTo(Scenario::class, 'scenario_id');
    }
}
