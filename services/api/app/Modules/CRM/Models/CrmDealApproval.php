<?php

namespace App\Modules\CRM\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmDealApproval extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'crm_deal_approvals';

    protected $fillable = [
        'workspace_id', 'deal_id', 'approval_rule_id',
        'status', 'current_approver_id', 'step',
        'approval_log', 'escalated_at', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'approval_log'  => 'array',
            'step'          => 'integer',
            'escalated_at'  => 'datetime',
            'resolved_at'   => 'datetime',
        ];
    }

    public function deal()
    {
        return $this->belongsTo(CrmDeal::class, 'deal_id');
    }

    public function rule()
    {
        return $this->belongsTo(CrmApprovalRule::class, 'approval_rule_id');
    }

    public function currentApprover()
    {
        return $this->belongsTo(\App\Core\Models\User::class, 'current_approver_id');
    }
}
