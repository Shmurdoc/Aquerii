<?php

namespace App\Modules\Delegation\Models;

use App\Core\Models\Item;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use Database\Factories\Delegation\DelegationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Delegation extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'workspace_id', 'item_id', 'from_user_id', 'to_user_id',
        'reason', 'notes', 'status', 'delegated_at',
        'expires_at', 'returned_at', 'accepted_at', 'accepted_by',
    ];

    protected static function newFactory(): DelegationFactory
    {
        return DelegationFactory::new();
    }

    protected function casts(): array
    {
        return [
            'delegated_at' => 'datetime',
            'expires_at' => 'datetime',
            'returned_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn ($model) => $model->id ??= (string) Str::uuid());
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }

    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }
}
