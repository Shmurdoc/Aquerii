<?php

namespace App\Modules\Chat\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChatMessage extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'chat_messages';

    protected $fillable = [
        'channel_id', 'user_id', 'body', 'attachments', 'reply_to', 'is_edited', 'is_deleted',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'is_edited' => 'boolean',
            'is_deleted' => 'boolean',
        ];
    }

    public function channel()
    {
        return $this->belongsTo(ChatChannel::class, 'channel_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function replyTo()
    {
        return $this->belongsTo(self::class, 'reply_to');
    }

    public function scopeForChannel($query, string $channelId)
    {
        return $query->where('channel_id', $channelId);
    }
}
