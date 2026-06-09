<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Plugin extends Model
{
    use HasUuids;

    protected $table = 'plugins';

    protected $fillable = [
        'slug', 'name', 'description', 'version', 'author', 'category',
        'icon_url', 'repository_url', 'settings_schema', 'hooks',
        'is_active', 'is_official', 'install_count', 'rating',
    ];

    protected function casts(): array
    {
        return [
            'settings_schema' => 'array',
            'hooks' => 'array',
            'is_active' => 'boolean',
            'is_official' => 'boolean',
            'rating' => 'decimal:2',
        ];
    }

    public function installations()
    {
        return $this->hasMany(PluginInstallation::class, 'plugin_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    public function scopeOfficial($query)
    {
        return $query->where('is_official', true);
    }
}
