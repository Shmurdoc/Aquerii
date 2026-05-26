<?php

namespace App\Modules\Email\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Email extends Model
{
    use HasUuids;

    protected $fillable = [
        'workspace_id', 'email_account_id', 'thread_id', 'external_message_id',
        'direction', 'from_address', 'from_name', 'to_addresses', 'cc_addresses',
        'bcc_addresses', 'subject', 'body_html', 'body_text', 'is_read', 'received_at',
    ];

    protected $casts = [
        'to_addresses'  => 'array',
        'cc_addresses'  => 'array',
        'bcc_addresses' => 'array',
        'is_read'       => 'boolean',
        'received_at'   => 'datetime',
    ];

    public function thread(): BelongsTo
    {
        return $this->belongsTo(EmailThread::class, 'thread_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(EmailAttachment::class, 'email_id');
    }

    public function aiSuggestions(): HasMany
    {
        return $this->hasMany(EmailAiSuggestion::class, 'email_id');
    }
}
