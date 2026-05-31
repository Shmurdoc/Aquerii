<?php

namespace App\Modules\JobCards\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class JobCardTemplate extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'workspace_id', 'name', 'industry', 'description',
        'default_tasks', 'default_fields', 'safety_checklist',
        'is_global', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'default_tasks' => 'json',
            'default_fields' => 'json',
            'safety_checklist' => 'json',
            'is_global' => 'boolean',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn ($model) => $model->id ??= (string) Str::uuid());
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
