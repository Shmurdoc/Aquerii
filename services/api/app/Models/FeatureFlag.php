<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class FeatureFlag extends Model
{
    use HasUuids;

    protected $table      = 'superadmin.feature_flags';
    protected $primaryKey = 'key';
    public    $incrementing = false;
    protected $keyType    = 'string';

    protected $fillable = ['key', 'enabled', 'description', 'workspace_ids'];

    protected $casts = [
        'enabled'       => 'boolean',
        'workspace_ids' => 'array',
    ];

    // Helper: check if flag is on for a given workspace
    public static function isEnabled(string $key, ?string $workspaceId = null): bool
    {
        $flag = static::find($key);
        if (! $flag || ! $flag->enabled) return false;

        $ids = $flag->workspace_ids;
        if (empty($ids)) return true; // global

        return $workspaceId && in_array($workspaceId, $ids);
    }
}
