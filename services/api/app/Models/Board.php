<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Board extends Model
{
    use HasUuids, HasFactory, SoftDeletes;

    protected $table = 'boards';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'type', 'board_type',
        'icon', 'color', 'visibility', 'default_view',
        'settings', 'position', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'settings'    => 'array',
            'is_archived' => 'boolean',
            'position'    => 'float',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function columns()
    {
        return $this->hasMany(BoardColumn::class);
    }

    public function groups()
    {
        return $this->hasMany(BoardGroup::class);
    }

    public function items()
    {
        return $this->hasMany(Item::class);
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'workspace_members', 'workspace_id', 'user_id', 'workspace_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_archived', false);
    }

    public function scopeForWorkspace($query, string $workspaceId)
    {
        return $query->where('workspace_id', $workspaceId);
    }
}
