<?php

namespace App\Modules\Marketing\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Campaign extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'marketing_campaigns';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'type', 'status',
        'channel', 'budget', 'actual_spend', 'started_at', 'ended_at',
        'target_audience', 'goal', 'tags', 'metadata',
        'sent_count', 'opened_count', 'clicked_count', 'converted_count',
        'launched_by',
    ];

    protected function casts(): array
    {
        return [
            'budget' => 'decimal:2',
            'actual_spend' => 'decimal:2',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'target_audience' => 'array',
            'tags' => 'array',
            'metadata' => 'array',
            'sent_count' => 'integer',
            'opened_count' => 'integer',
            'clicked_count' => 'integer',
            'converted_count' => 'integer',
        ];
    }

    public function audience()
    {
        return $this->hasMany(CampaignAudience::class, 'campaign_id');
    }

    public function launchedBy()
    {
        return $this->belongsTo(User::class, 'launched_by');
    }
}
