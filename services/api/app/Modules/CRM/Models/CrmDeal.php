<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\Item;
use App\Core\Models\User;
use Database\Factories\Modules\CRM\Models\CrmDealFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmDeal extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function newFactory(): CrmDealFactory
    {
        return CrmDealFactory::new();
    }

    protected $table = 'crm_deals';

    protected $fillable = [
        'workspace_id', 'pipeline_id', 'stage_id', 'contact_id', 'company_id',
        'linked_item_id', 'owner_id', 'created_by', 'title', 'value', 'currency', 'probability',
        'expected_close_date', 'won_at', 'lost_at', 'notes', 'custom_fields',
        'loss_reason', 'loss_details', 'forecast_category', 'discount_amount',
        'discount_type', 'competitors', 'last_activity_at', 'stage_history',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'float',
            'probability' => 'integer',
            'expected_close_date' => 'date',
            'won_at' => 'datetime',
            'lost_at' => 'datetime',
            'custom_fields' => 'array',
            'loss_reason' => 'string',
            'forecast_category' => 'string',
            'discount_type' => 'string',
            'discount_amount' => 'float',
            'competitors' => 'array',
            'stage_history' => 'array',
            'last_activity_at' => 'datetime',
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

    public function linkedItem()
    {
        return $this->belongsTo(Item::class, 'linked_item_id');
    }

    public function activities()
    {
        return $this->hasMany(CrmActivity::class, 'deal_id')->orderBy('activity_date', 'desc');
    }
}
