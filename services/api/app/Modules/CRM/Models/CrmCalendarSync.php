<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmCalendarSync extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'crm_calendar_syncs';

    protected $fillable = [
        'workspace_id', 'user_id', 'provider', 'calendar_id',
        'calendar_name', 'is_active', 'last_synced_at', 'sync_config',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_synced_at' => 'datetime',
            'sync_config' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
