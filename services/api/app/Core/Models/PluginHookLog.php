<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PluginHookLog extends Model
{
    use HasUuids;

    protected $table = 'plugin_hook_logs';

    protected $fillable = [
        'installation_id', 'hook_name', 'payload', 'result', 'status', 'error', 'execution_ms',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'result' => 'array',
        ];
    }

    public function installation()
    {
        return $this->belongsTo(PluginInstallation::class, 'installation_id');
    }
}
