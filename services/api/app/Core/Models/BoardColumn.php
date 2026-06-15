<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class BoardColumn extends Model
{
    use HasUuids;

    protected $table = 'board_columns';

    protected $fillable = [
        // Allow mass assignment for provisioning/seeders which provide a `name` field
        'board_id', 'workspace_id', 'name', 'title', 'type',
        'settings', 'is_system', 'position', 'width',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'is_system' => 'boolean',
            'position' => 'float',
            'width' => 'integer',
        ];
    }

    public function board()
    {
        return $this->belongsTo(Board::class);
    }
}
