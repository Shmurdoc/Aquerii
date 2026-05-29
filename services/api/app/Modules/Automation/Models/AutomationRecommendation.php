<?php

namespace App\Modules\Automation\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AutomationRecommendation extends Model
{
    use HasUuids;

    protected $table = 'automation_recommendations';

    protected $fillable = [
        'workspace_id', 'title', 'description', 'category', 'priority',
        'trigger_config', 'actions', 'pattern_type', 'evidence',
        'status', 'automation_id', 'dismissed_at',
    ];

    protected function casts(): array
    {
        return [
            'trigger_config' => 'array',
            'actions' => 'array',
            'evidence' => 'array',
            'dismissed_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(\App\Core\Models\Workspace::class);
    }

    public function automation()
    {
        return $this->belongsTo(Automation::class, 'automation_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeForWorkspace($query, string $workspaceId)
    {
        return $query->where('workspace_id', $workspaceId);
    }
}
