<?php

namespace App\Modules\Email\Http\Controllers;

use App\Modules\Email\Models\ProjectEmailAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class ProjectEmailAddressController extends Controller
{
    public function index(Request $request, string $workspace): JsonResponse
    {
        $addresses = ProjectEmailAddress::where('workspace_id', $workspace)
            ->withCount('inboundEmails')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $addresses]);
    }

    public function store(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'label' => 'nullable|string|max:100',
            'target_board_id' => 'nullable|exists:boards,id',
        ]);

        // Generate a unique email address
        $prefix = Str::slug($data['label'] ?? 'inbox') . '-' . Str::random(6);
        $address = "{$prefix}@inbound.aquerii.app";

        $projectEmail = ProjectEmailAddress::create([
            'workspace_id' => $workspace,
            'address' => $address,
            'label' => $data['label'] ?? null,
            'target_board_id' => $data['target_board_id'] ?? null,
            'is_active' => true,
        ]);

        return response()->json(['data' => $projectEmail], 201);
    }

    public function update(Request $request, string $workspace, string $address): JsonResponse
    {
        $projectEmail = ProjectEmailAddress::where('workspace_id', $workspace)->findOrFail($address);

        $data = $request->validate([
            'label' => 'nullable|string|max:100',
            'target_board_id' => 'nullable|exists:boards,id',
            'is_active' => 'boolean',
        ]);

        $projectEmail->update($data);

        return response()->json(['data' => $projectEmail->fresh()]);
    }

    public function destroy(string $workspace, string $address): JsonResponse
    {
        ProjectEmailAddress::where('workspace_id', $workspace)->findOrFail($address)->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
