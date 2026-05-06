<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class BoardColumn extends Model
{
    use HasUuids;

    protected $table = 'board_columns';

    protected $fillable = [
        'board_id', 'workspace_id', 'name', 'type',
        'settings', 'is_system', 'position', 'width',
    ];

    protected function casts(): array
    {
        return [
            'settings'    => 'array',
            'is_system'   => 'boolean',
            'position'    => 'float',
            'width'       => 'integer',
        ];
    }

    public function board()
    {
        return $this->belongsTo(Board::class);
    }
}
