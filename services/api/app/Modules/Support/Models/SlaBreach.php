<?php

namespace App\Modules\Support\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SlaBreach extends Model
{
    use HasUuids;

    protected $table = 'support_sla_breaches';

    protected $fillable = [
        'ticket_id', 'sla_policy_id', 'breach_type',
        'breached_at', 'escalated_to', 'escalated_at', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'breached_at' => 'datetime',
            'escalated_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function ticket()
    {
        return $this->belongsTo(Ticket::class, 'ticket_id');
    }

    public function slaPolicy()
    {
        return $this->belongsTo(TicketSla::class, 'sla_policy_id');
    }
}
