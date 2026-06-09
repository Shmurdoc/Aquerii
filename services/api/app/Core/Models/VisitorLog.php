<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class VisitorLog extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'visitor_logs';

    protected $fillable = [
        'workspace_id', 'kiosk_id',
        'visitor_type', 'full_name', 'company', 'id_number', 'vehicle_reg',
        'host_name', 'host_contact', 'host_user_id', 'host_notified', 'host_notified_at',
        'purpose', 'signed_in_at', 'signed_out_at',
        'badge_printed', 'badge_printed_at',
    ];

    protected function casts(): array
    {
        return [
            'signed_in_at' => 'datetime',
            'signed_out_at' => 'datetime',
            'host_notified_at' => 'datetime',
            'badge_printed_at' => 'datetime',
            'host_notified' => 'boolean',
            'badge_printed' => 'boolean',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function kiosk(): BelongsTo
    {
        return $this->belongsTo(GateKiosk::class);
    }

    public function hostUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function getDurationMinutesAttribute(): ?int
    {
        if ($this->signed_out_at === null) {
            return null;
        }

        return (int) $this->signed_in_at->diffInMinutes($this->signed_out_at);
    }
}
