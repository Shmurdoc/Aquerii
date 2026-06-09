<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AdminAuditLog extends Model
{
    use HasUuids;

    protected $table = 'admin_audit_log';

    public $timestamps = false;

    protected $fillable = [
        'admin_user_id', 'action', 'entity_type', 'entity_id',
        'before_data', 'after_data', 'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'before_data' => 'array',
            'after_data' => 'array',
        ];
    }
}
