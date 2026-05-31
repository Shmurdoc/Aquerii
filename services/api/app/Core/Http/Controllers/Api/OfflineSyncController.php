<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Board;
use App\Core\Models\Item;
use App\Core\Models\SyncConflict;
use App\Modules\Documents\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfflineSyncController extends Controller
{
    public function conflicts(Request $request, string $workspace): JsonResponse
    {
        $conflicts = SyncConflict::where('workspace_id', $workspace)
            ->where('user_id', $request->user()->id)
            ->unresolved()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $conflicts]);
    }

    public function resolve(Request $request, string $workspace, string $conflict): JsonResponse
    {
        $data = $request->validate([
            'resolution' => 'required|string|in:local,server,merged,dismissed',
            'merged_data' => 'nullable|array',
            'resolution_notes' => 'nullable|string|max:500',
        ]);

        $conflictModel = SyncConflict::where('workspace_id', $workspace)
            ->where('user_id', $request->user()->id)
            ->findOrFail($conflict);

        $conflictModel->update([
            'resolution' => $data['resolution'],
            'merged_data' => $data['merged_data'] ?? null,
            'resolution_notes' => $data['resolution_notes'] ?? null,
            'resolved_at' => now(),
        ]);

        // If resolved, apply the chosen data to the entity
        if ($data['resolution'] !== 'dismissed') {
            $this->applyResolution($conflictModel);
        }

        return response()->json(['data' => $conflictModel->fresh()]);
    }

    public function resolveAll(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'strategy' => 'required|string|in:keep_local,keep_server',
        ]);

        $conflicts = SyncConflict::where('workspace_id', $workspace)
            ->where('user_id', $request->user()->id)
            ->unresolved()
            ->get();

        foreach ($conflicts as $conflict) {
            $resolution = $data['strategy'] === 'keep_local' ? 'local' : 'server';
            $conflict->update([
                'resolution' => $resolution,
                'resolved_at' => now(),
            ]);
            $this->applyResolution($conflict);
        }

        return response()->json(['message' => 'Resolved '.$conflicts->count().' conflicts']);
    }

    private function applyResolution(SyncConflict $conflict): void
    {
        $modelClass = $this->resolveModelClass($conflict->entity_type);
        if (! $modelClass) {
            return;
        }

        $entity = $modelClass::find($conflict->entity_id);
        if (! $entity) {
            return;
        }

        switch ($conflict->resolution) {
            case 'local':
                $entity->update($conflict->local_data);
                break;
            case 'server':
                // No-op — server state is already correct
                break;
            case 'merged':
                if ($conflict->merged_data) {
                    $entity->update($conflict->merged_data);
                }
                break;
        }
    }

    private function resolveModelClass(string $type): ?string
    {
        return match ($type) {
            'item' => Item::class,
            'document' => Document::class,
            'board' => Board::class,
            default => null,
        };
    }
}
