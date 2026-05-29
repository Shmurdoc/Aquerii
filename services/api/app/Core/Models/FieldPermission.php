<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class FieldPermission extends Model
{
    use HasUuids;

    protected $table = 'field_permissions';

    protected $fillable = [
        'workspace_id', 'entity_type', 'field_name', 'role', 'permission',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function scopeForEntity($query, string $entityType)
    {
        return $query->where('entity_type', $entityType);
    }

    public function scopeForRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    public function scopeForField($query, string $fieldName)
    {
        return $query->where('field_name', $fieldName);
    }

    /**
     * Check if a role has access to a field.
     */
    public static function hasAccess(string $workspaceId, string $entityType, string $fieldName, string $role, string $requiredPermission = 'read'): bool
    {
        // Owners and admins always have full access
        if (in_array($role, ['owner', 'admin'])) {
            return true;
        }

        $permission = static::where('workspace_id', $workspaceId)
            ->where('entity_type', $entityType)
            ->where('field_name', $fieldName)
            ->where('role', $role)
            ->first();

        if (!$permission) {
            // Default: members can read/write, viewers can read
            return $role === 'member' || ($role === 'viewer' && $requiredPermission === 'read');
        }

        if ($permission->permission === 'hidden') {
            return false;
        }

        if ($requiredPermission === 'read') {
            return true; // read or write both allow read
        }

        return $permission->permission === 'write';
    }

    /**
     * Get visible fields for a role.
     */
    public static function getVisibleFields(string $workspaceId, string $entityType, string $role): array
    {
        if (in_array($role, ['owner', 'admin'])) {
            return []; // empty = all fields visible
        }

        $hidden = static::where('workspace_id', $workspaceId)
            ->where('entity_type', $entityType)
            ->where('role', $role)
            ->where('permission', 'hidden')
            ->pluck('field_name')
            ->toArray();

        return $hidden;
    }
}
