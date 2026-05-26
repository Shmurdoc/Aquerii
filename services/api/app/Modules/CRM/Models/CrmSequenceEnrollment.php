<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CrmSequenceEnrollment extends Model
{
    use HasUuids;

    protected $table = 'crm_sequence_enrollments';

    protected $fillable = [
        'workspace_id', 'sequence_id', 'contact_id', 'deal_id',
        'current_step', 'status', 'entered_at', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'current_step' => 'integer',
            'entered_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function sequence()
    {
        return $this->belongsTo(CrmSequence::class, 'sequence_id');
    }

    public function contact()
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function deal()
    {
        return $this->belongsTo(CrmDeal::class, 'deal_id');
    }
}
