<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;

class UserSession extends Model
{
    protected $table = 'sessions';

    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'user_id', 'ip_address', 'user_agent', 'payload', 'last_activity',
    ];

    protected function casts(): array
    {
        return [
            'last_activity' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
