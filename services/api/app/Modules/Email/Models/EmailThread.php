<?php

namespace App\Modules\Email\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailThread extends Model
{
    use HasUuids;

    protected $fillable = [
        'workspace_id', 'email_account_id', 'subject', 'external_thread_id',
        'status', 'is_starred', 'last_message_at', 'message_count',
    ];

    protected $casts = [
        'is_starred'      => 'boolean',
        'last_message_at' => 'datetime',
        'message_count'   => 'integer',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(EmailAccount::class, 'email_account_id');
    }

    public function emails(): HasMany
    {
        return $this->hasMany(Email::class, 'thread_id');
    }
}
