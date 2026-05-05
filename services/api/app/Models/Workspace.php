<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Workspace extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'logo_url', 'cover_url', 'custom_domain',
        'timezone', 'plan', 'plan_status', 'trial_ends_at',
        'seat_quota', 'storage_quota_bytes', 'settings',
    ];

    protected function casts(): array
    {
        return [
            'settings'              => 'array',
            'trial_ends_at'         => 'datetime',
            'automations_reset_at'  => 'datetime',
            'ai_credits_reset_at'   => 'datetime',
            'storage_quota_bytes'   => 'integer',
            'storage_used_bytes'    => 'integer',
        ];
    }

    public function members()
    {
        return $this->hasMany(WorkspaceMember::class);
    }

    public function boards()
    {
        return $this->hasMany(Board::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function storageUsedPercent(): float
    {
        if ($this->storage_quota_bytes === 0) return 0.0;
        return ($this->storage_used_bytes / $this->storage_quota_bytes) * 100;
    }

    public function hasStorageCapacity(int $bytes): bool
    {
        return ($this->storage_used_bytes + $bytes) <= $this->storage_quota_bytes;
    }
}
