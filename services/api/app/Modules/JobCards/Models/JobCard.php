<?php

namespace App\Modules\JobCards\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Database\Factories\JobCards\JobCardFactory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class JobCard extends Model
{
    use HasFactory, SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'workspace_id', 'assigned_to', 'client_id', 'title', 'description',
        'status', 'priority', 'industry_template', 'location', 'custom_fields',
        'started_at', 'completed_at', 'signed_off_at', 'signed_off_by',
        'signoff_notes', 'rejection_reason', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'custom_fields' => 'json',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'signed_off_at' => 'datetime',
        ];
    }

    public static function newFactory(): Factory
    {
        return JobCardFactory::new();
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

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function signedOffBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signed_off_by');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(JobCardTask::class, 'job_card_id');
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(JobCardTimeEntry::class, 'job_card_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(JobCardAttachment::class, 'job_card_id');
    }

    public function materials(): HasMany
    {
        return $this->hasMany(JobCardMaterial::class, 'job_card_id');
    }
}
