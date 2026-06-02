<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Model;

class FeatureFlag extends Model
{
    // PK is a string slug (e.g. 'module.boards'), not a UUID. HasUuids would
    // auto-generate UUIDs on create() and overwrite the intended key.
    protected $table = 'superadmin.feature_flags';

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'enabled', 'description', 'workspace_ids'];

    protected $casts = [
        'enabled' => 'boolean',
        'workspace_ids' => 'array',
    ];

    // Helper: check if flag is on for a given workspace
    public static function isEnabled(string $key, ?string $workspaceId = null): bool
    {
        $flag = static::find($key);
        if (! $flag || ! $flag->enabled) {
            return false;
        }

        $ids = $flag->workspace_ids;
        if (empty($ids)) {
            return true;
        } // global

        return $workspaceId && in_array($workspaceId, $ids);
    }
}
