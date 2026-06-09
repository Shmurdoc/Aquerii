<?php

namespace App\Core\Http\Controllers;

use App\Core\Models\WebhookDelivery;
use App\Core\Models\WebhookEndpoint;
use App\Core\Models\Workspace;
use App\Core\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookEndpointController extends Controller
{
    public function __construct(private AuditService $audit) {}

    /**
     * List endpoints for the workspace.
     */
    public function index(Workspace $workspace): JsonResponse
    {
        $endpoints = WebhookEndpoint::where('workspace_id', $workspace->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $endpoints]);
    }

    /**
     * Create a new endpoint. Secret is auto-generated and returned ONCE
     * in the response — subsequent reads omit it.
     */
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'url' => ['required', 'string', 'url:https', 'max:2048'],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['required', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $secret = WebhookEndpoint::generateSecret();

        $endpoint = WebhookEndpoint::create([
            'workspace_id' => $workspace->id,
            'name' => $validated['name'],
            'url' => $validated['url'],
            'secret' => $secret,
            'events' => $validated['events'],
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => $request->user()->id,
        ]);

        $this->audit->log(
            action: 'webhook_endpoint.created',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'webhook_endpoint',
            resourceId: $endpoint->id,
            after: ['name' => $endpoint->name, 'url' => $endpoint->url, 'events' => $endpoint->events]
        );

        // Reveal the secret ONLY on creation. Caller MUST save it now.
        $payload = $endpoint->toArray();
        $payload['secret'] = $secret;

        return response()->json(['data' => $payload], 201);
    }

    public function show(Workspace $workspace, WebhookEndpoint $endpoint): JsonResponse
    {
        $this->ensureBelongsToWorkspace($workspace, $endpoint);

        return response()->json(['data' => $endpoint]);
    }

    public function update(Request $request, Workspace $workspace, WebhookEndpoint $endpoint): JsonResponse
    {
        $this->ensureBelongsToWorkspace($workspace, $endpoint);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'url' => ['sometimes', 'string', 'url:https', 'max:2048'],
            'events' => ['sometimes', 'array', 'min:1'],
            'events.*' => ['required_with:events', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $before = [
            'name' => $endpoint->name,
            'url' => $endpoint->url,
            'events' => $endpoint->events,
            'is_active' => $endpoint->is_active,
        ];

        $endpoint->update($validated);

        $this->audit->log(
            action: 'webhook_endpoint.updated',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'webhook_endpoint',
            resourceId: $endpoint->id,
            before: $before,
            after: $endpoint->only(['name', 'url', 'events', 'is_active'])
        );

        return response()->json(['data' => $endpoint->fresh()]);
    }

    public function destroy(Request $request, Workspace $workspace, WebhookEndpoint $endpoint): JsonResponse
    {
        $this->ensureBelongsToWorkspace($workspace, $endpoint);

        $endpoint->delete();

        $this->audit->log(
            action: 'webhook_endpoint.deleted',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'webhook_endpoint',
            resourceId: $endpoint->id
        );

        return response()->json(null, 204);
    }

    /**
     * Generate a new signing secret and invalidate the old one.
     * Returns the new secret ONCE — caller must save it immediately.
     */
    public function rotateSecret(Request $request, Workspace $workspace, WebhookEndpoint $endpoint): JsonResponse
    {
        $this->ensureBelongsToWorkspace($workspace, $endpoint);

        $newSecret = WebhookEndpoint::generateSecret();
        $endpoint->update(['secret' => $newSecret]);

        $this->audit->log(
            action: 'webhook_endpoint.secret_rotated',
            workspaceId: $workspace->id,
            userId: $request->user()->id,
            resourceType: 'webhook_endpoint',
            resourceId: $endpoint->id
        );

        return response()->json([
            'data' => [
                'id' => $endpoint->id,
                'secret' => $newSecret,
                'rotated_at' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * List recent delivery attempts for an endpoint (most-recent first).
     */
    public function deliveries(Request $request, Workspace $workspace, WebhookEndpoint $endpoint): JsonResponse
    {
        $this->ensureBelongsToWorkspace($workspace, $endpoint);

        $perPage = min(100, max(1, (int) $request->query('per_page', 50)));

        $deliveries = WebhookDelivery::where('webhook_endpoint_id', $endpoint->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => $deliveries->items(),
            'meta' => [
                'total' => $deliveries->total(),
                'per_page' => $deliveries->perPage(),
                'current_page' => $deliveries->currentPage(),
                'last_page' => $deliveries->lastPage(),
            ],
        ]);
    }

    private function ensureBelongsToWorkspace(Workspace $workspace, WebhookEndpoint $endpoint): void
    {
        abort_if($endpoint->workspace_id !== $workspace->id, 404, 'Webhook endpoint not found.');
    }
}
