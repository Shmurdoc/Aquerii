<?php

namespace App\Core\Console\Commands;

use App\Core\Models\Workspace;
use App\Core\Services\UsageService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RecalculateUsage extends Command
{
    protected $signature = 'workspace:recalculate-usage {--workspace= : Only recalculate for a specific workspace}';

    protected $description = 'Recalculate workspace_usage from actual database counts';

    public function handle(UsageService $usage): int
    {
        $query = Workspace::query();
        if ($workspaceId = $this->option('workspace')) {
            $query->where('id', $workspaceId);
        }

        $workspaces = $query->get();
        $bar = $this->output->createProgressBar($workspaces->count());
        $bar->start();

        foreach ($workspaces as $workspace) {
            $usage->set($workspace, 'boards', DB::table('boards')->where('workspace_id', $workspace->id)->whereNull('deleted_at')->count());
            $usage->set($workspace, 'seats', DB::table('workspace_members')->where('workspace_id', $workspace->id)->where('status', 'active')->count());
            $usage->set($workspace, 'crm_pipelines', DB::table('crm_pipelines')->where('workspace_id', $workspace->id)->count());
            $usage->set($workspace, 'automation_rules', DB::table('automations')->where('workspace_id', $workspace->id)->count());
            $usage->set($workspace, 'storage', DB::table('uploads')->where('workspace_id', $workspace->id)->sum('size') ?? 0);
            $usage->set($workspace, 'email_accounts', DB::table('email_accounts')->where('workspace_id', $workspace->id)->count());
            $usage->set($workspace, 'max_invoices', DB::table('invoices')->where('workspace_id', $workspace->id)->whereMonth('created_at', now()->month)->count());

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Usage recalculated for ' . $workspaces->count() . ' workspace(s).');

        return self::SUCCESS;
    }
}
