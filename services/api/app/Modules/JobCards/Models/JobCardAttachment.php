<?php

namespace App\Modules\JobCards\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class JobCardAttachment extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'job_card_id', 'filename', 'filepath', 'mime_type',
        'file_size', 'category', 'uploaded_by',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn ($model) => $model->id ??= (string) Str::uuid());
    }

    public function jobCard(): BelongsTo
    {
        return $this->belongsTo(JobCard::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Core\Models\User::class, 'uploaded_by');
    }
}
