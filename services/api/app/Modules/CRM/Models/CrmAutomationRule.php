<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmAutomationRule extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'crm_automation_rules';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'trigger_type',
        'trigger_config', 'conditions', 'actions',
        'is_active', 'run_count', 'last_run_at', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'trigger_config' => 'array',
            'conditions' => 'array',
            'actions' => 'array',
            'is_active' => 'boolean',
            'run_count' => 'integer',
            'last_run_at' => 'datetime',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
