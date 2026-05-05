<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CrmDeal extends Model
{
    use HasUuids;

    protected $table = 'crm_deals';

    protected $fillable = [
        'workspace_id', 'pipeline_id', 'stage_id', 'contact_id', 'company_id',
        'owner_id', 'title', 'value', 'currency', 'probability',
        'expected_close_date', 'won_at', 'lost_at', 'notes', 'custom_fields',
    ];

    protected function casts(): array
    {
        return [
            'value'               => 'float',
            'probability'         => 'integer',
            'expected_close_date' => 'date',
            'won_at'              => 'datetime',
            'lost_at'             => 'datetime',
            'custom_fields'       => 'array',
        ];
    }

    public function pipeline()
    {
        return $this->belongsTo(CrmPipeline::class);
    }

    public function stage()
    {
        return $this->belongsTo(CrmPipelineStage::class, 'stage_id');
    }

    public function contact()
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function company()
    {
        return $this->belongsTo(CrmCompany::class, 'company_id');
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
