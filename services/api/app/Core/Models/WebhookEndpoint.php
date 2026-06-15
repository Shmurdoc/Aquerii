<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WebhookEndpoint extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'webhook_endpoints';

    protected $fillable = [
        'workspace_id', 'name', 'url', 'events', 'is_active',
        'secret_hash', 'created_by', 'last_triggered_at', 'last_response_status',
    ];

    protected function casts(): array
    {
        return [
            'events' => 'array',
            'is_active' => 'boolean',
            'last_triggered_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function deliveries()
    {
        return $this->hasMany(WebhookDelivery::class, 'webhook_endpoint_id');
    }
}
