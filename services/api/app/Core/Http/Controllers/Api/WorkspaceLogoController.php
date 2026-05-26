<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class WorkspaceLogoController extends Controller
{
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorizeWorkspaceOwner($request, $workspace);

        $request->validate([
            'image' => [
                'required', 'image',
                'mimes:jpg,jpeg,png,webp,svg',
                'max:2048',
                'dimensions:min_width=64,min_height=64,max_width=2000,max_height=2000',
            ],
        ]);

        // Delete old logo from S3 if present
        if ($workspace->logo_url) {
            $oldPath = ltrim(parse_url($workspace->logo_url, PHP_URL_PATH), '/');
            if (Storage::disk('s3')->exists($oldPath)) {
                Storage::disk('s3')->delete($oldPath);
            }
        }

        $ext  = strtolower($request->file('image')->getClientOriginalExtension());
        $path = "workspaces/{$workspace->id}/logo.{$ext}";
        Storage::disk('s3')->put($path, file_get_contents($request->file('image')), 'public');

        $url = Storage::disk('s3')->url($path);
        $workspace->update(['logo_url' => $url]);

        return response()->json(['data' => ['logo_url' => $url]]);
    }

    public function destroy(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorizeWorkspaceOwner($request, $workspace);

        if ($workspace->logo_url) {
            $path = ltrim(parse_url($workspace->logo_url, PHP_URL_PATH), '/');
            if (Storage::disk('s3')->exists($path)) {
                Storage::disk('s3')->delete($path);
            }
            $workspace->update(['logo_url' => null]);
        }

        return response()->json(['data' => ['logo_url' => null]]);
    }

    private function authorizeWorkspaceOwner(Request $request, Workspace $workspace): void
    {
        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $request->user()->id)
            ->whereIn('role', ['owner', 'admin'])
            ->first();

        abort_unless($member, 403, 'Only workspace owners and admins can manage the logo.');
    }
}
