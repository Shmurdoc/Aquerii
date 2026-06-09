<?php

namespace App\Http\Controllers\Api;

use App\Core\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Jobs\ReplayIntegrationWebhookEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IntegrationReliabilityController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request, string $workspace): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $query = DB::table('integration_webhook_events')
            ->where(function ($q) use ($workspace) {
                $q->where('workspace_id', $workspace)
                    ->orWhereNull('workspace_id');
            });

        if ($request->filled('status')) {
            $query->where('status', (string) $request->query('status'));
        }
        if ($request->filled('processor')) {
            $query->where('processor', (string) $request->query('processor'));
        }

        $rows = $query->orderByDesc('created_at')->paginate(min(200, max(1, (int) $request->query('per_page', 50))));

        return response()->json([
            'data' => $rows->items(),
            'meta' => [
                'total' => $rows->total(),
                'per_page' => $rows->perPage(),
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
            ],
        ]);
    }

    public function retry(Request $request, string $workspace, string $eventId): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $event = DB::table('integration_webhook_events')
            ->where('id', $eventId)
            ->where(function ($q) use ($workspace) {
                $q->where('workspace_id', $workspace)
                    ->orWhereNull('workspace_id');
            })
            ->first();

        abort_unless($event, 404, 'Webhook event not found.');

        DB::table('integration_webhook_events')
            ->where('id', $eventId)
            ->update([
                'status' => 'retrying',
                'retry_count' => ((int) $event->retry_count) + 1,
                'next_retry_at' => now(),
                'updated_at' => now(),
            ]);

        ReplayIntegrationWebhookEvent::dispatch($eventId);

        $this->audit->log(
            action: 'integration.webhook.retry_requested',
            workspaceId: $workspace,
            userId: $request->user()->id,
            resourceType: 'integration_webhook_event',
            resourceId: $eventId,
            before: ['status' => $event->status, 'retry_count' => $event->retry_count],
            after: ['status' => 'retrying', 'retry_count' => ((int) $event->retry_count) + 1]
        );

        return response()->json([
            'data' => [
                'retry_requested' => true,
                'event_id' => $eventId,
                'message' => 'Webhook event marked for retry and replay job dispatched.',
            ],
        ]);
    }

    public function replayNow(Request $request, string $workspace, string $eventId): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        ReplayIntegrationWebhookEvent::dispatchSync($eventId);

        $event = DB::table('integration_webhook_events')->where('id', $eventId)->first();
        abort_unless($event, 404, 'Webhook event not found.');

        return response()->json([
            'data' => [
                'replayed' => true,
                'event_id' => $eventId,
                'status' => $event->status,
                'last_error' => $event->last_error,
            ],
        ]);
    }

    private function requireWorkspaceAdmin(Request $request, string $workspaceId): void
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first(['role']);

        abort_if(! $member || ! in_array($member->role, ['owner', 'admin'], true), 403, 'Insufficient role for this action.');
    }
}
