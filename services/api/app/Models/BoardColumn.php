<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class BoardColumn extends Model
{
    use HasUuids;

    protected $table = 'board_columns';

    protected $fillable = [
        'board_id', 'workspace_id', 'name', 'field_type',
        'options', 'is_required', 'is_system', 'position',
    ];

    protected function casts(): array
    {
        return [
            'options'     => 'array',
            'is_required' => 'boolean',
            'is_system'   => 'boolean',
            'position'    => 'float',
        ];
    }

    public function board()
    {
        return $this->belongsTo(Board::class);
    }
}
