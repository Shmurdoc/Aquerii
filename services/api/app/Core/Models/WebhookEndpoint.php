<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WebhookEndpoint extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'webhook_endpoints';

    protected $fillable = [
        'workspace_id',
        'name',
        'url',
        'secret',
        'events',
        'is_active',
        'created_by',
        'last_triggered_at',
        'last_response_status',
    ];

    protected $hidden = [
        'secret',
    ];

    protected function casts(): array
    {
        return [
            'events' => 'array',
            'is_active' => 'boolean',
            'last_triggered_at' => 'datetime',
            'last_response_status' => 'integer',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(WebhookDelivery::class, 'webhook_endpoint_id');
    }

    /**
     * Generate a fresh signing secret. 32 random bytes, base64-encoded.
     * Not Str::random — base64-encoded random_bytes() gives true CSPRNG output.
     */
    public static function generateSecret(): string
    {
        return base64_encode(random_bytes(32));
    }
}
