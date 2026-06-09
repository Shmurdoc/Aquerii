<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class Item extends Model
{
    use HasFactory, HasUuids, Searchable, SoftDeletes;

    protected $fillable = [
        'workspace_id', 'board_id', 'group_id', 'parent_id',
        'title', 'description', 'position', 'status', 'priority',
        'due_date', 'reminder_at', 'estimated_hours',
        'column_values', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'description' => 'array',
            'column_values' => 'array',
            'due_date' => 'datetime',
            'reminder_at' => 'datetime',
            'tracked_hours' => 'float',
            'estimated_hours' => 'float',
            'version' => 'integer',
        ];
    }

    public function board()
    {
        return $this->belongsTo(Board::class);
    }

    public function group()
    {
        return $this->belongsTo(BoardGroup::class);
    }

    public function parent()
    {
        return $this->belongsTo(Item::class, 'parent_id');
    }

    public function subitems()
    {
        return $this->hasMany(Item::class, 'parent_id');
    }

    public function assignees()
    {
        return $this->belongsToMany(User::class, 'item_assignees')
            ->withPivot('assigned_by', 'assigned_at');
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'board_id' => $this->board_id,
            'group_id' => $this->group_id,
            'title' => $this->title,
            'status' => $this->status,
            'priority' => $this->priority,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
