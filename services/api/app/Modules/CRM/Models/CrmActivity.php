<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CrmActivity extends Model
{
    use HasUuids;

    protected $table = 'crm_activities';

    protected $fillable = [
        'workspace_id', 'deal_id', 'contact_id',
        'type', 'subject', 'description', 'activity_date', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'activity_date' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function deal()
    {
        return $this->belongsTo(CrmDeal::class, 'deal_id');
    }

    public function contact()
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
