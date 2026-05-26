<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmApprovalRule extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'crm_approval_rules';

    protected $fillable = [
        'workspace_id', 'name', 'description',
        'threshold_min', 'threshold_max', 'approval_chain',
        'approvers', 'escalation_hours', 'escalation_user_id',
        'is_active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'threshold_min'    => 'decimal:2',
            'threshold_max'    => 'decimal:2',
            'approvers'        => 'array',
            'escalation_hours' => 'integer',
            'is_active'        => 'boolean',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function escalationUser()
    {
        return $this->belongsTo(User::class, 'escalation_user_id');
    }
}
