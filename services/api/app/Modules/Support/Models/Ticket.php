<?php

namespace App\Modules\Support\Models;

use App\Core\Models\User;
use App\Modules\CRM\Models\CrmContact;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ticket extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'support_tickets';

    protected $fillable = [
        'workspace_id', 'contact_id', 'subject', 'description',
        'status', 'priority', 'channel', 'assigned_to',
        'sla_policy_id', 'sla_due_at', 'sla_breached_at',
        'source', 'tags', 'custom_fields', 'closed_at',
        'resolution_summary',
    ];

    protected function casts(): array
    {
        return [
            'tags'           => 'array',
            'custom_fields'  => 'array',
            'sla_due_at'     => 'datetime',
            'sla_breached_at' => 'datetime',
            'closed_at'      => 'datetime',
        ];
    }

    public function messages()
    {
        return $this->hasMany(TicketMessage::class, 'ticket_id');
    }

    public function contact()
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function slaPolicy()
    {
        return $this->belongsTo(TicketSla::class, 'sla_policy_id');
    }
}
