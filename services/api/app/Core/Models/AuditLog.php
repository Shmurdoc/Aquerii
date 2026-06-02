<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    /** audit_logs has only created_at — no updated_at column */
    const UPDATED_AT = null;

    /**
     * Audit logs are written by the system via dedicated services that set
     * each field explicitly. We use an explicit fillable list (not $guarded = [])
     * so a future controller that accidentally passes user input cannot smuggle
     * in arbitrary columns like `ip_address` spoofing.
     */
    protected $fillable = [
        'workspace_id', 'user_id', 'action', 'resource_type', 'resource_id',
        'before', 'after', 'meta', 'ip_address', 'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'before' => 'array',
            'after' => 'array',
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
