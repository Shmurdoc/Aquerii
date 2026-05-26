<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CrmQuota extends Model
{
    use HasUuids;

    protected $table = 'crm_quotas';

    protected $fillable = [
        'workspace_id', 'user_id', 'quota_amount', 'currency',
        'period_type', 'year', 'month', 'quarter', 'attainment',
    ];

    protected function casts(): array
    {
        return [
            'quota_amount' => 'float',
            'attainment' => 'float',
            'year' => 'integer',
            'month' => 'integer',
            'quarter' => 'integer',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeForPeriod($query, $year, $periodType, $monthOrQuarter = null)
    {
        $query->where('year', $year)->where('period_type', $periodType);

        if ($periodType === 'monthly' && $monthOrQuarter !== null) {
            $query->where('month', $monthOrQuarter);
        } elseif ($periodType === 'quarterly' && $monthOrQuarter !== null) {
            $query->where('quarter', $monthOrQuarter);
        }

        return $query;
    }
}
