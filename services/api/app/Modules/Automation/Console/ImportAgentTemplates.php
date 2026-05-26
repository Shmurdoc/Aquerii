<?php

namespace App\Modules\Automation\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportAgentTemplates extends Command
{
    protected $signature = 'automation:import-agents
        {path : Path to agents.json file}
        {--category= : Override category for all imported agents}
        {--dry-run : Preview without inserting}';

    protected $description = 'Import automation templates from awesome-openclaw-agents agents.json';

    private const CATEGORY_MAP = [
        'business' => 'crm',
        'creative' => 'content',
        'data' => 'general',
        'development' => 'general',
        'devops' => 'devops',
        'ecommerce' => 'ecommerce',
        'education' => 'education',
        'finance' => 'finance',
        'freelance' => 'general',
        'healthcare' => 'general',
        'hr' => 'hr',
        'legal' => 'legal',
        'marketing' => 'marketing',
        'personal' => 'general',
        'productivity' => 'general',
        'real-estate' => 'general',
        'saas' => 'general',
        'security' => 'security',
        'supply-chain' => 'general',
        'compliance' => 'legal',
        'voice' => 'general',
        'customer-success' => 'support',
        'automation' => 'general',
        'ollama' => 'general',
        'moltbook' => 'marketing',
    ];

    public function handle(): int
    {
        $path = $this->argument('path');
        $categoryOverride = $this->option('category');
        $dryRun = $this->option('dry-run');

        if (! file_exists($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $json = file_get_contents($path);
        $data = json_decode($json, true);

        if (! $data || ! isset($data['agents'])) {
            $this->error('Invalid agents.json format');

            return self::FAILURE;
        }

        $imported = 0;
        $skipped = 0;

        foreach ($data['agents'] as $agent) {
            $name = $agent['name'] ?: $agent['id'];
            $description = $agent['role'] ?: "Automation template inspired by {$agent['id']} agent";

            $exists = DB::table('automation_templates')
                ->where('name', $name)
                ->exists();

            if ($exists) {
                $this->line("  [skip] {$name}");
                $skipped++;

                continue;
            }

            $category = $categoryOverride ?? (self::CATEGORY_MAP[$agent['category']] ?? 'general');

            $template = [
                'id' => (string) Str::uuid(),
                'name' => $name,
                'description' => $description,
                'category' => $category,
                'trigger_type' => 'item.created',
                'trigger_config' => json_encode([]),
                'actions' => json_encode([
                    ['type' => 'send_notification', 'title' => $name, 'body' => $description],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if ($dryRun) {
                $this->line("  [would import] {$name} ({$category})");
            } else {
                DB::table('automation_templates')->insert($template);
                $this->info("  [import] {$name} ({$category})");
            }

            $imported++;
        }

        $this->info("Import complete: {$imported} imported, {$skipped} skipped");

        return self::SUCCESS;
    }
}
