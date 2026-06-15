<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Alert;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AlertController extends Controller
{
    public function index(Request $request, string $workspaceId): JsonResponse
    {
        $alerts = Alert::where('workspace_id', $workspaceId)
            ->whereNull('acknowledged_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $alerts]);
    }

    public function acknowledge(Request $request, string $workspaceId, string $alertId): JsonResponse
    {
        if (! Str::isUuid($alertId)) {
            return response()->json(['message' => 'Alert not found.'], 404);
        }

        $alert = Alert::where('workspace_id', $workspaceId)
            ->where('id', $alertId)
            ->first();

        if (! $alert) {
            return response()->json(['message' => 'Alert not found.'], 404);
        }

        $alert->update(['acknowledged_at' => now()]);

        return response()->json(['data' => $alert->fresh()]);
    }
}
