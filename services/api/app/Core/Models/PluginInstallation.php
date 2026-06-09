<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PluginInstallation extends Model
{
    use HasUuids;

    protected $table = 'plugin_installations';

    protected $fillable = [
        'workspace_id', 'plugin_id', 'is_enabled', 'settings', 'installed_at',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'settings' => 'array',
            'installed_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function plugin()
    {
        return $this->belongsTo(Plugin::class, 'plugin_id');
    }

    public function hookLogs()
    {
        return $this->hasMany(PluginHookLog::class, 'installation_id');
    }

    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }
}
