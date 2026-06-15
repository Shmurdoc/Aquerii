<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class WorkOrder extends Model
{
    use HasUuids;

    protected $table = 'work_orders';

    protected $fillable = [
        'workspace_id', 'crm_deal_id', 'work_order_number', 'title',
        'description', 'status', 'scope_of_work', 'location',
        'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
        'assigned_worker_id', 'total_hours_estimated', 'total_hours_actual',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_start' => 'datetime',
            'scheduled_end' => 'datetime',
            'actual_start' => 'datetime',
            'actual_end' => 'datetime',
            'total_hours_estimated' => 'decimal:2',
            'total_hours_actual' => 'decimal:2',
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

    public function assignedWorker()
    {
        return $this->belongsTo(User::class, 'assigned_worker_id');
    }
}
