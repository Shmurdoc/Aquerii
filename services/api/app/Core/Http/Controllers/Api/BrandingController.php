<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BrandingController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $host = $request->getHost();
        $parts = explode('.', $host);
        $subdomain = count($parts) >= 3 ? $parts[0] : null;

        $cacheKey = "branding:{$host}";

        $data = Cache::remember($cacheKey, 300, function () use ($subdomain, $host) {
            $workspace = null;

            if ($subdomain && ! in_array($subdomain, ['www', 'api', 'app'])) {
                $workspace = Workspace::where('slug', $subdomain)
                    ->orWhere('custom_domain', $host)
                    ->select(['id', 'name', 'slug', 'logo_url', 'color', 'icon', 'settings'])
                    ->first();
            }

            if (! $workspace) {
                return [
                    'workspace_id' => null,
                    'name' => 'Aquerii',
                    'logo_url' => null,
                    'color' => '#7c3aed',
                    'icon' => null,
                    'doc_template' => 'modern',
                    'is_default' => true,
                ];
            }

            return [
                'workspace_id' => $workspace->id,
                'name' => $workspace->name,
                'logo_url' => $workspace->logo_url,
                'color' => $workspace->color ?? '#7c3aed',
                'icon' => $workspace->icon,
                'doc_template' => ($workspace->settings['doc_template'] ?? 'modern'),
                'is_default' => false,
            ];
        });

        return response()->json(['data' => $data])
            ->header('Cache-Control', 'public, max-age=300');
    }
}
