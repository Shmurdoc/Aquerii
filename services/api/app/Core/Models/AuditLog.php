<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    /** audit_logs has only created_at — no updated_at column */
    const UPDATED_AT = null;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'before'     => 'array',
            'after'      => 'array',
            'meta'       => 'array',
            'created_at' => 'datetime',
        ];
    }
}
