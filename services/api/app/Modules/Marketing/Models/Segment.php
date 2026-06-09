<?php

namespace App\Modules\Marketing\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Segment extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'marketing_segments';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'criteria',
        'cached_count', 'last_calculated_at', 'is_dynamic',
        'tags', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'criteria' => 'array',
            'cached_count' => 'integer',
            'last_calculated_at' => 'datetime',
            'is_dynamic' => 'boolean',
            'tags' => 'array',
        ];
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
