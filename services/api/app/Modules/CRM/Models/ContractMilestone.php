<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContractMilestone extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'contract_milestones';

    protected $fillable = [
        'workspace_id', 'crm_deal_id', 'name', 'description',
        'amount', 'due_date', 'status', 'completed_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'due_date' => 'date',
            'completed_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function deal()
    {
        return $this->belongsTo(CrmDeal::class, 'crm_deal_id');
    }
}
