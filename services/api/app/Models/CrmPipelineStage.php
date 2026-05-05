<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CrmPipelineStage extends Model
{
    use HasUuids;

    protected $table = 'crm_pipeline_stages';

    protected $fillable = [
        'pipeline_id', 'workspace_id', 'name', 'color', 'position', 'win_probability',
    ];

    protected function casts(): array
    {
        return [
            'position'        => 'float',
            'win_probability' => 'integer',
        ];
    }

    public function pipeline()
    {
        return $this->belongsTo(CrmPipeline::class);
    }

    public function deals()
    {
        return $this->hasMany(CrmDeal::class, 'stage_id');
    }
}
