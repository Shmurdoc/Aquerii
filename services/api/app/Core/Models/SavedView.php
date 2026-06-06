<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedView extends Model
{
    use HasUuids;

    protected $table = 'saved_views';

    protected $fillable = [
        'workspace_id',
        'user_id',
        'name',
        'entity_type',
        'filters',
        'sort',
        'columns',
        'is_shared',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'sort' => 'array',
            'columns' => 'array',
            'is_shared' => 'boolean',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
