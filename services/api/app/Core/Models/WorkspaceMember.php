<?php

namespace App\Core\Models;

use Database\Factories\WorkspaceMemberFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkspaceMember extends Model
{
    use HasFactory, HasUuids;

    protected static function newFactory()
    {
        return WorkspaceMemberFactory::new();
    }

    protected $table = 'workspace_members';

    // The workspace_members table has only created_at, no updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'workspace_id', 'user_id', 'role', 'invited_by', 'joined_at',
        'status', 'invited_email', 'invite_token',
    ];

    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
