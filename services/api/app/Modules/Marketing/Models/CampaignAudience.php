<?php

namespace App\Modules\Marketing\Models;

use App\Modules\CRM\Models\CrmContact;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CampaignAudience extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'marketing_campaign_audiences';

    protected $fillable = [
        'campaign_id', 'contact_id', 'status', 'sent_at',
        'opened_at', 'clicked_at', 'converted_at', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'opened_at' => 'datetime',
            'clicked_at' => 'datetime',
            'converted_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function contact()
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }
}
