<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BulkActionController extends Controller
{
    /**
     * POST /workspaces/{workspace}/bulk
     *
     * Body:
     * {
     *   "resource": "tasks",
     *   "action": "delete" | "restore" | "archive" | "status",
     *   "ids": ["uuid1", "uuid2"],
     *   "payload": { "status": "cancelled" }   // for status action
     * }
     */
    public function handle(Request $request, string $workspaceId): \Illuminate\Http\JsonResponse
    {
        $data = $request->validate([
            'resource' => 'required|string|in:items,invoices,sales_orders,crm_companies,crm_contacts,purchase_orders',
            'action'   => 'required|string|in:delete,restore,archive,status',
            'ids'      => 'required|array|min:1|max:100',
            'ids.*'    => 'required|uuid',
            'payload'  => 'nullable|array',
        ]);

        $table   = $data['resource'];
        $action  = $data['action'];
        $ids     = $data['ids'];
        $payload = $data['payload'] ?? [];

        // Scope to workspace
        $baseQuery = DB::table($table)
            ->where('workspace_id', $workspaceId)
            ->whereIn('id', $ids);

        $affected = match ($action) {
            'delete'  => $baseQuery->update(['deleted_at' => now(), 'updated_at' => now()]),
            'restore' => DB::table($table)
                ->where('workspace_id', $workspaceId)
                ->whereIn('id', $ids)
                ->whereNotNull('deleted_at')
                ->update(['deleted_at' => null, 'updated_at' => now()]),
            'archive' => $baseQuery->update(['status' => 'archived', 'updated_at' => now()]),
            'status'  => $baseQuery->update(['status' => $payload['status'] ?? 'draft', 'updated_at' => now()]),
            default   => 0,
        };

        return response()->json(['affected' => $affected]);
    }
}
