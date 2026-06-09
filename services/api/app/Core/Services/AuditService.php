<?php

namespace App\Core\Services;

use App\Core\Models\AuditLog;
use Illuminate\Http\Request;

class AuditService
{
    public function log(
        string $action,
        string|int $workspaceId,
        string|int $userId,
        string $resourceType,
        string|int|null $resourceId = null,
        ?array $before = null,
        ?array $after = null,
        ?array $meta = null,
        ?Request $request = null,
    ): AuditLog {
        $data = [
            'workspace_id' => (string) $workspaceId,
            'user_id' => (string) $userId,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId ? (string) $resourceId : null,
            'before' => $before,
            'after' => $after,
            'meta' => $meta,
        ];

        if ($request) {
            $data['ip_address'] = $request->ip();
            $data['user_agent'] = $request->userAgent();
        }

        return AuditLog::create($data);
    }
}
