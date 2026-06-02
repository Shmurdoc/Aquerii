<?php

namespace App\Core\Services;

use App\Core\Models\AuditLog;

class AuditService
{
    public function log(
        string $action,
        ?string $workspaceId = null,
        ?string $userId = null,
        ?string $resourceType = null,
        ?string $resourceId = null,
        array $before = [],
        array $after = [],
        array $meta = []
    ): void {
        AuditLog::create([
            'workspace_id' => $workspaceId,
            'user_id' => $userId,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'before' => $before ?: null,
            'after' => $after ?: null,
            'meta' => $meta ?: null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
