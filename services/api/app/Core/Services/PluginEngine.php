<?php

namespace App\Core\Services;

use App\Core\Models\PluginHookLog;
use App\Core\Models\PluginInstallation;
use Illuminate\Support\Facades\Log;

class PluginEngine
{
    /**
     * Execute all enabled plugins for a given hook.
     */
    public function executeHook(string $workspaceId, string $hookName, array $payload): array
    {
        $installations = PluginInstallation::where('workspace_id', $workspaceId)
            ->enabled()
            ->with('plugin')
            ->get()
            ->filter(fn ($inst) => in_array($hookName, $inst->plugin->hooks ?? []));

        $results = [];

        foreach ($installations as $installation) {
            $result = $this->executePlugin($installation, $hookName, $payload);
            $results[] = [
                'plugin' => $installation->plugin->slug,
                'result' => $result,
            ];
        }

        return $results;
    }

    private function executePlugin(PluginInstallation $installation, string $hookName, array $payload): array
    {
        $startTime = microtime(true);

        try {
            // For now, plugins are configured via settings_schema
            // In a full implementation, this would load and execute plugin code
            $result = $this->simulatePluginExecution($installation, $hookName, $payload);

            $executionMs = (int) ((microtime(true) - $startTime) * 1000);

            PluginHookLog::create([
                'installation_id' => $installation->id,
                'hook_name' => $hookName,
                'payload' => $payload,
                'result' => $result,
                'status' => 'success',
                'execution_ms' => $executionMs,
            ]);

            return $result;
        } catch (\Exception $e) {
            $executionMs = (int) ((microtime(true) - $startTime) * 1000);

            PluginHookLog::create([
                'installation_id' => $installation->id,
                'hook_name' => $hookName,
                'payload' => $payload,
                'status' => 'failed',
                'error' => $e->getMessage(),
                'execution_ms' => $executionMs,
            ]);

            Log::error('Plugin execution failed', [
                'plugin' => $installation->plugin->slug,
                'hook' => $hookName,
                'error' => $e->getMessage(),
            ]);

            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Simulate plugin execution based on settings.
     * In production, this would load actual plugin code.
     */
    private function simulatePluginExecution(PluginInstallation $installation, string $hookName, array $payload): array
    {
        $settings = $installation->settings;

        // Example: webhook plugin sends HTTP request
        if ($installation->plugin->slug === 'webhook') {
            return [
                'action' => 'webhook_sent',
                'url' => $settings['url'] ?? null,
                'hook' => $hookName,
            ];
        }

        // Example: Slack plugin sends notification
        if ($installation->plugin->slug === 'slack') {
            return [
                'action' => 'slack_notification',
                'channel' => $settings['channel'] ?? '#general',
                'hook' => $hookName,
            ];
        }

        // Default: acknowledge execution
        return [
            'action' => 'executed',
            'hook' => $hookName,
            'plugin' => $installation->plugin->slug,
        ];
    }
}
