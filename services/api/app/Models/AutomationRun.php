<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AutomationRun extends Model
{
    use HasUuids;

    protected $table = 'automation_runs';

    protected $fillable = [
        'automation_id', 'workspace_id', 'triggered_by_item_id',
        'status', 'started_at', 'completed_at', 'error',
    ];

    protected function casts(): array
    {
        return [
            'started_at'   => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function automation()
    {
        return $this->belongsTo(Automation::class);
    }

    public function triggeringItem()
    {
        return $this->belongsTo(Item::class, 'triggered_by_item_id');
    }
}
