<?php

namespace App\Modules\Support\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TicketSla extends Model
{
    use HasUuids;

    protected $table = 'support_ticket_slas';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'priority',
        'first_response_hours', 'resolution_hours',
        'escalation_user_id', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'sla_policy_id');
    }

    public function breaches()
    {
        return $this->hasMany(SlaBreach::class, 'sla_policy_id');
    }
}
