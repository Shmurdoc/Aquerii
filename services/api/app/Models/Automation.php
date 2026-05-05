<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Automation extends Model
{
    use HasUuids;

    protected $table = 'automations';

    protected $fillable = [
        'workspace_id', 'board_id', 'created_by', 'name',
        'trigger_type', 'trigger_config', 'actions', 'is_active', 'run_count', 'last_run_at',
    ];

    protected function casts(): array
    {
        return [
            'trigger_config' => 'array',
            'actions'        => 'array',
            'is_active'      => 'boolean',
            'run_count'      => 'integer',
            'last_run_at'    => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function board()
    {
        return $this->belongsTo(Board::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function runs()
    {
        return $this->hasMany(AutomationRun::class);
    }
}
