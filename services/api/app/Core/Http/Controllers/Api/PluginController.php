<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Plugin;
use App\Core\Models\PluginInstallation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PluginController extends Controller
{
    public function marketplace(Request $request, string $workspace): JsonResponse
    {
        $query = Plugin::active();

        if ($request->category) {
            $query->forCategory($request->category);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'ilike', "%{$this->escapeLike($request->search)}%")
                    ->orWhere('description', 'ilike', "%{$this->escapeLike($request->search)}%");
            });
        }

        $plugins = $query->orderBy('install_count', 'desc')->get();

        // Mark which ones are installed
        $installedIds = PluginInstallation::where('workspace_id', $workspace)
            ->pluck('plugin_id')
            ->toArray();

        $plugins->each(function ($plugin) use ($installedIds) {
            $plugin->is_installed = in_array($plugin->id, $installedIds);
        });

        return response()->json(['data' => $plugins]);
    }

    public function installed(Request $request, string $workspace): JsonResponse
    {
        $installations = PluginInstallation::where('workspace_id', $workspace)
            ->with('plugin')
            ->orderBy('installed_at', 'desc')
            ->get();

        return response()->json(['data' => $installations]);
    }

    public function install(Request $request, string $workspace, string $plugin): JsonResponse
    {
        $pluginModel = Plugin::findOrFail($plugin);

        // Check if already installed
        $exists = PluginInstallation::where('workspace_id', $workspace)
            ->where('plugin_id', $plugin)
            ->exists();

        if ($exists) {
            return response()->json(['error' => 'Plugin already installed'], 409);
        }

        $installation = PluginInstallation::create([
            'workspace_id' => $workspace,
            'plugin_id' => $plugin,
            'is_enabled' => true,
            'settings' => $pluginModel->settings_schema,
            'installed_at' => now(),
        ]);

        // Increment install count
        $pluginModel->increment('install_count');

        return response()->json(['data' => $installation->load('plugin')], 201);
    }

    public function uninstall(Request $request, string $workspace, string $plugin): JsonResponse
    {
        PluginInstallation::where('workspace_id', $workspace)
            ->where('plugin_id', $plugin)
            ->delete();

        // Decrement install count
        Plugin::where('id', $plugin)->decrement('install_count');

        return response()->json(['message' => 'Uninstalled']);
    }

    public function toggle(Request $request, string $workspace, string $plugin): JsonResponse
    {
        $installation = PluginInstallation::where('workspace_id', $workspace)
            ->where('plugin_id', $plugin)
            ->firstOrFail();

        $installation->update(['is_enabled' => ! $installation->is_enabled]);

        return response()->json(['data' => $installation->fresh()]);
    }

    public function updateSettings(Request $request, string $workspace, string $plugin): JsonResponse
    {
        $installation = PluginInstallation::where('workspace_id', $workspace)
            ->where('plugin_id', $plugin)
            ->firstOrFail();

        $data = $request->validate([
            'settings' => 'required|array',
        ]);

        $installation->update(['settings' => $data['settings']]);

        return response()->json(['data' => $installation->fresh()]);
    }
}
