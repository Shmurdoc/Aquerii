<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Scenario extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'scenarios';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'status', 'is_baseline',
        'snapshot_data', 'simulation_results', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_baseline' => 'boolean',
            'snapshot_data' => 'array',
            'simulation_results' => 'array',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function adjustments()
    {
        return $this->hasMany(ScenarioAdjustment::class, 'scenario_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeBaselines($query)
    {
        return $query->where('is_baseline', true);
    }
}
