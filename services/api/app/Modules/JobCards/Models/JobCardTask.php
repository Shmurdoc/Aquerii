<?php

namespace App\Modules\JobCards\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class JobCardTask extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'job_card_id', 'description', 'is_checked', 'position',
        'category', 'completed_by', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'is_checked' => 'boolean',
            'completed_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn ($model) => $model->id ??= (string) Str::uuid());
    }

    public function jobCard(): BelongsTo
    {
        return $this->belongsTo(JobCard::class);
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
