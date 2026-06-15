<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\WebhookDelivery;
use App\Core\Models\WebhookEndpoint;
use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WebhookEndpointController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $endpoints = WebhookEndpoint::where('workspace_id', $workspace->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->makeHidden('secret_hash');

        return response()->json(['data' => $endpoints]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'url' => 'required|url|max:2048',
            'events' => 'required|array',
            'events.*' => 'string|max:100',
            'is_active' => 'sometimes|boolean',
        ]);

        $secret = Str::random(48);

        $endpoint = WebhookEndpoint::create([
            'workspace_id' => $workspace->id,
            'name' => $validated['name'],
            'url' => $validated['url'],
            'events' => $validated['events'],
            'is_active' => $validated['is_active'] ?? true,
            'secret_hash' => bcrypt($secret),
            'created_by' => $request->user()->id,
        ]);

        $endpoint->makeHidden('secret_hash');
        $endpoint->secret = $secret;

        return response()->json(['data' => $endpoint], 201);
    }

    public function show(Workspace $workspace, WebhookEndpoint $webhookEndpoint): JsonResponse
    {
        abort_if($webhookEndpoint->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $webhookEndpoint->makeHidden('secret_hash')]);
    }

    public function update(Request $request, Workspace $workspace, WebhookEndpoint $webhookEndpoint): JsonResponse
    {
        abort_if($webhookEndpoint->workspace_id !== $workspace->id, 404);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'url' => 'sometimes|url|max:2048',
            'events' => 'sometimes|array',
            'events.*' => 'string|max:100',
            'is_active' => 'sometimes|boolean',
        ]);

        $webhookEndpoint->update($validated);

        return response()->json(['data' => $webhookEndpoint->fresh()->makeHidden('secret_hash')]);
    }

    public function destroy(Workspace $workspace, WebhookEndpoint $webhookEndpoint): JsonResponse
    {
        abort_if($webhookEndpoint->workspace_id !== $workspace->id, 404);

        $webhookEndpoint->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function rotateSecret(Request $request, Workspace $workspace, WebhookEndpoint $webhookEndpoint): JsonResponse
    {
        abort_if($webhookEndpoint->workspace_id !== $workspace->id, 404);

        $secret = Str::random(48);

        $webhookEndpoint->update(['secret_hash' => bcrypt($secret)]);

        $webhookEndpoint->makeHidden('secret_hash');
        $webhookEndpoint->secret = $secret;

        return response()->json(['data' => $webhookEndpoint]);
    }

    public function deliveries(Request $request, Workspace $workspace, WebhookEndpoint $webhookEndpoint): JsonResponse
    {
        abort_if($webhookEndpoint->workspace_id !== $workspace->id, 404);

        $deliveries = WebhookDelivery::where('webhook_endpoint_id', $webhookEndpoint->id)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json(['data' => $deliveries]);
    }
}
