<?php

namespace App\Core\Models;

use Database\Factories\BoardGroupFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BoardGroup extends Model
{
    use HasFactory, HasUuids;

    protected static function newFactory()
    {
        return BoardGroupFactory::new();
    }

    protected $table = 'board_groups';

    protected $fillable = [
        'board_id', 'workspace_id', 'name', 'color', 'collapsed', 'is_collapsed', 'position',
    ];

    protected function casts(): array
    {
        return [
            'collapsed' => 'boolean',
            'is_collapsed' => 'boolean',
            'position' => 'float',
        ];
    }

    public function board()
    {
        return $this->belongsTo(Board::class);
    }

    public function items()
    {
        return $this->hasMany(Item::class, 'group_id');
    }
}
