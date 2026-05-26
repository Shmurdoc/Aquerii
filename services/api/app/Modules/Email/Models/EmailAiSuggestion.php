<?php

namespace App\Modules\Email\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailAiSuggestion extends Model
{
    use HasUuids;

    protected $fillable = [
        'workspace_id', 'email_id', 'type', 'content',
        'extracted_tasks', 'status', 'approved_by', 'approved_at',
    ];

    protected $casts = [
        'extracted_tasks' => 'array',
        'approved_at'     => 'datetime',
    ];

    public function email(): BelongsTo
    {
        return $this->belongsTo(Email::class, 'email_id');
    }
}
