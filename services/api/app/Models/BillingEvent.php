<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class BillingEvent extends Model
{
    use HasUuids;

    protected $table = 'billing_events';

    protected $fillable = [
        'workspace_id', 'user_id', 'event_type', 'processor',
        'processor_event_id', 'amount_cents', 'currency', 'payload', 'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload'      => 'array',
            'amount_cents' => 'integer',
            'processed_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
