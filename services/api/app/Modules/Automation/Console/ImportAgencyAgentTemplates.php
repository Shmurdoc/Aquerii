<?php

namespace App\Modules\Automation\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportAgencyAgentTemplates extends Command
{
    protected $signature = 'automation:import-agency-agents
        {path : Path to directory containing category subdirectories with *.md files}
        {--dry-run : Preview without inserting}';

    protected $description = 'Import automation templates from agency-agents markdown files';

    private const CATEGORY_MAP = [
        'academic' => 'education',
        'design' => 'content',
        'engineering' => 'general',
        'examples' => 'general',
        'finance' => 'finance',
        'game-development' => 'general',
        'marketing' => 'marketing',
        'paid-media' => 'marketing',
        'product' => 'general',
        'project-management' => 'project',
        'sales' => 'sales',
        'spatial-computing' => 'general',
        'specialized' => 'general',
        'strategy' => 'general',
        'support' => 'support',
        'testing' => 'devops',
    ];

    public function handle(): int
    {
        $path = $this->argument('path');
        $dryRun = $this->option('dry-run');

        if (! is_dir($path)) {
            $this->error("Directory not found: {$path}");

            return self::FAILURE;
        }

        $imported = 0;
        $skipped = 0;

        $dirs = new \DirectoryIterator($path);

        foreach ($dirs as $dir) {
            if (! $dir->isDir() || $dir->isDot()) {
                continue;
            }

            $categoryDir = $dir->getFilename();
            $category = self::CATEGORY_MAP[$categoryDir] ?? 'general';

            $files = glob($dir->getPathname().'/*.md');

            foreach ($files as $file) {
                $content = file_get_contents($file);

                if (! preg_match('/^---\s*(.*?)\s*---/s', $content, $matches)) {
                    $this->line("  [skip] {$file} — no frontmatter");
                    $skipped++;

                    continue;
                }

                $frontmatter = $this->parseFrontmatter($matches[1]);
                $name = $frontmatter['name'] ?? pathinfo($file, PATHINFO_FILENAME);
                $description = $frontmatter['description'] ?? '';

                $exists = DB::table('automation_templates')
                    ->where('name', $name)
                    ->exists();

                if ($exists) {
                    $this->line("  [skip] {$name}");
                    $skipped++;

                    continue;
                }

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
        }

        $this->info("Import complete: {$imported} imported, {$skipped} skipped");

        return self::SUCCESS;
    }

    private function parseFrontmatter(string $raw): array
    {
        $data = [];
        foreach (explode("\n", $raw) as $line) {
            if (preg_match('/^(\w+):\s*(.*)$/', $line, $m)) {
                $data[$m[1]] = trim($m[2]);
            }
        }

        return $data;
    }
}
