<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Comment extends Model
{
    use HasUuids;

    protected $table = 'comments';

    protected $fillable = [
        'workspace_id', 'item_id', 'user_id', 'body', 'edited_at',
    ];

    protected function casts(): array
    {
        return [
            'edited_at' => 'datetime',
        ];
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
