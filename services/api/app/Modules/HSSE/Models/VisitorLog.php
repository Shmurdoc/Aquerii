<?php

namespace App\Modules\HSSE\Models;

use App\Core\Models\Workspace;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitorLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'workspace_id', 'kiosk_id', 'visitor_type', 'full_name', 'company',
        'id_number', 'vehicle_reg', 'host_name', 'host_contact', 'host_user_id',
        'host_notified', 'host_notified_at', 'purpose', 'signed_in_at',
        'signed_out_at', 'duration_minutes', 'badge_printed', 'badge_printed_at',
    ];

    protected function casts(): array
    {
        return [
            'host_notified' => 'boolean',
            'host_notified_at' => 'datetime',
            'signed_in_at' => 'datetime',
            'signed_out_at' => 'datetime',
            'badge_printed' => 'boolean',
            'badge_printed_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function hostUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }
}
