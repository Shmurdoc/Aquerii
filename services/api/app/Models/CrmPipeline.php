<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CrmPipeline extends Model
{
    use HasUuids;

    protected $table = 'crm_pipelines';

    protected $fillable = [
        'workspace_id', 'name', 'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function stages()
    {
        return $this->hasMany(CrmPipelineStage::class, 'pipeline_id');
    }

    public function deals()
    {
        return $this->hasMany(CrmDeal::class, 'pipeline_id');
    }
}
