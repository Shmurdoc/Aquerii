<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\Workspace;
use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CrmContactStageHistory extends Model
{
    use HasUuids;

    protected $table = 'crm_contact_stage_history';

    public $timestamps = false;

    protected $fillable = [
        'workspace_id', 'contact_id', 'from_stage', 'to_stage',
        'reason', 'changed_by', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function contact()
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
