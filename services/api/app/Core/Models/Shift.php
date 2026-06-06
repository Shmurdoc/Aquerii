<?php

namespace App\Core\Models;

use App\Core\Models\Workspace;
use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Shift extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function newFactory()
    {
        return \Database\Factories\ShiftFactory::new();
    }

    protected $table = 'shifts';

    protected $fillable = [
        'workspace_id', 'name', 'start_time', 'end_time',
        'duration_hours', 'color', 'type', 'description', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'string',
            'end_time' => 'string',
            'duration_hours' => 'decimal:1',
            'is_active' => 'boolean',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ShiftAssignment::class, 'shift_id');
    }
}
