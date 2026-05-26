<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmCallLog extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'crm_call_logs';

    protected $fillable = [
        'workspace_id', 'contact_id', 'deal_id', 'user_id',
        'call_direction', 'duration_seconds', 'notes', 'call_outcome',
        'callee_phone', 'recording_url', 'called_at',
    ];

    protected function casts(): array
    {
        return [
            'duration_seconds' => 'integer',
            'called_at' => 'datetime',
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

    public function deal()
    {
        return $this->belongsTo(CrmDeal::class, 'deal_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
