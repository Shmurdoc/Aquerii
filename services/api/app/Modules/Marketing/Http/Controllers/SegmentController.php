<?php

namespace App\Modules\Marketing\Http\Controllers;

use App\Modules\CRM\Models\CrmContact;
use App\Modules\Marketing\Models\Segment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SegmentController extends Controller
{
    public function index(Request $request, string $workspace): JsonResponse
    {
        $segments = Segment::where('workspace_id', $workspace)
            ->with('createdBy:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json(['data' => $segments]);
    }

    public function show(string $workspace, string $segment): JsonResponse
    {
        $segment = Segment::where('workspace_id', $workspace)
            ->with('createdBy:id,name')
            ->findOrFail($segment);

        return response()->json(['data' => $segment]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'criteria' => 'required|array',
            'is_dynamic' => 'boolean',
            'tags' => 'nullable|array',
        ]);

        $data['workspace_id'] = $workspace;
        $data['created_by'] = $request->user()?->id;
        $data['cached_count'] = 0;

        $segment = Segment::create($data);

        return response()->json(['data' => $segment], 201);
    }

    public function update(Request $request, string $workspace, string $segment): JsonResponse
    {
        $segment = Segment::where('workspace_id', $workspace)->findOrFail($segment);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'criteria' => 'sometimes|array',
            'is_dynamic' => 'boolean',
            'tags' => 'nullable|array',
        ]);

        $segment->update($data);

        return response()->json(['data' => $segment->fresh()]);
    }

    public function destroy(string $workspace, string $segment): JsonResponse
    {
        Segment::where('workspace_id', $workspace)->findOrFail($segment)->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }

    public function count(string $workspace, string $segment): JsonResponse
    {
        $segment = Segment::where('workspace_id', $workspace)->findOrFail($segment);
        $criteria = $segment->criteria;

        $query = CrmContact::where('workspace_id', $workspace);

        if (! empty($criteria['lifecycle_stages'])) {
            $query->whereIn('lifecycle_stage', $criteria['lifecycle_stages']);
        }
        if (! empty($criteria['sources'])) {
            $query->whereIn('source', $criteria['sources']);
        }
        if (! empty($criteria['tags'])) {
            $query->whereJsonContains('tags', $criteria['tags']);
        }
        if (! empty($criteria['date_from'])) {
            $query->where('created_at', '>=', $criteria['date_from']);
        }
        if (! empty($criteria['date_to'])) {
            $query->where('created_at', '<=', $criteria['date_to']);
        }
        if (! empty($criteria['score_min'])) {
            $query->where('lead_score', '>=', $criteria['score_min']);
        }
        if (! empty($criteria['score_max'])) {
            $query->where('lead_score', '<=', $criteria['score_max']);
        }

        $count = $query->count();

        $segment->update(['cached_count' => $count, 'last_calculated_at' => now()]);

        return response()->json(['data' => ['count' => $count]]);
    }

    public function preview(string $workspace, string $segment): JsonResponse
    {
        $segment = Segment::where('workspace_id', $workspace)->findOrFail($segment);
        $criteria = $segment->criteria;

        $query = CrmContact::where('workspace_id', $workspace);

        if (! empty($criteria['lifecycle_stages'])) {
            $query->whereIn('lifecycle_stage', $criteria['lifecycle_stages']);
        }
        if (! empty($criteria['sources'])) {
            $query->whereIn('source', $criteria['sources']);
        }
        if (! empty($criteria['tags'])) {
            $query->whereJsonContains('tags', $criteria['tags']);
        }
        if (! empty($criteria['date_from'])) {
            $query->where('created_at', '>=', $criteria['date_from']);
        }
        if (! empty($criteria['date_to'])) {
            $query->where('created_at', '<=', $criteria['date_to']);
        }
        if (! empty($criteria['score_min'])) {
            $query->where('lead_score', '>=', $criteria['score_min']);
        }
        if (! empty($criteria['score_max'])) {
            $query->where('lead_score', '<=', $criteria['score_max']);
        }

        $contacts = $query->select('id', 'first_name', 'last_name', 'email', 'lead_score', 'lifecycle_stage')
            ->limit(10)->get();

        return response()->json(['data' => $contacts]);
    }
}
