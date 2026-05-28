<?php

namespace App\Modules\Chat\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ChatParticipant extends Model
{
    use HasUuids;

    protected $table = 'chat_participants';

    public $timestamps = false;

    protected $fillable = [
        'channel_id', 'user_id', 'last_read_at', 'is_muted',
    ];

    protected function casts(): array
    {
        return [
            'last_read_at' => 'datetime',
            'is_muted' => 'boolean',
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
}
