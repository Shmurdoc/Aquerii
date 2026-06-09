<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

/**
 * Seeds the 16 generic system roles (Workstream A role taxonomy).
 *
 *   5 department roles  — employee-operations, employee-safety, employee-engineering,
 *                         employee-finance-admin, employee-contractors-visitors
 *   8 position roles   — pos-team-member … pos-executive (L1 → L8+)
 *   3 tier roles       — superadmin-creator, platform-admin, subscriber
 *
 * All roles are marked is_system = true and workspace_id = null, meaning
 * they are owned by the platform rather than any specific workspace and
 * are available to every workspace for assignment to members.
 *
 * Idempotent: uses firstOrCreate against the (name, guard_name) unique
 * index, so re-running the seeder is safe.
 */
class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $taxonomy = config('aquerii-roles');

        if (! is_array($taxonomy)) {
            throw new \RuntimeException(
                'config/aquerii-roles.php is missing or malformed. '
                .'RolePermissionSeeder cannot run without the role taxonomy.'
            );
        }

        $guardName = config('auth.defaults.guard', 'web');

        $groups = [
            'departments' => 'Department',
            'positions' => 'Position',
            'tiers' => 'Tier',
        ];

        $totalCreated = 0;
        $totalSkipped = 0;

        foreach ($groups as $key => $label) {
            $entries = $taxonomy[$key] ?? [];

            if (empty($entries)) {
                $this->command->warn("aquerii-roles.{$key} is empty; skipping.");

                continue;
            }

            foreach ($entries as $entry) {
                $slug = $entry['slug'] ?? null;
                $name = $entry['name'] ?? null;

                if (! $slug || ! $name) {
                    $this->command->warn("Skipping {$label} entry with missing slug/name: ".json_encode($entry));

                    continue;
                }

                $role = Role::firstOrCreate(
                    ['name' => $slug, 'guard_name' => $guardName],
                    ['name' => $slug, 'guard_name' => $guardName]
                );

                $wasRecentlyCreated = $role->wasRecentlyCreated;

                $this->applySystemFlags($role);

                if ($wasRecentlyCreated) {
                    $totalCreated++;
                    $this->command->info("  [+] {$label}: {$slug} ({$name})");
                } else {
                    $totalSkipped++;
                    $this->command->line("  [.] {$label}: {$slug} ({$name}) — already exists");
                }
            }
        }

        $this->command->newLine();
        $this->command->info("RolePermissionSeeder complete: {$totalCreated} created, {$totalSkipped} already present.");
    }

    /**
     * Mark the role as a system role scoped to no workspace.
     *
     * Uses Schema::hasColumn so the seeder remains forward-compatible: it
     * works whether or not the is_system / workspace_id columns have been
     * added to the roles table. When the columns are missing, the role is
     * still created and is identifiable as a system role by its slug prefix
     * (employee-*, pos-*, superadmin-*, platform-admin, subscriber).
     */
    private function applySystemFlags(Role $role): void
    {
        $table = config('permission.table_names.roles', 'roles');
        $columns = Schema::getColumnListing($table);

        $updates = [];

        if (in_array('is_system', $columns, true)) {
            $updates['is_system'] = true;
        }

        if (in_array('workspace_id', $columns, true)) {
            $updates['workspace_id'] = null;
        }

        if (! empty($updates)) {
            DB::table($table)
                ->where('id', $role->id)
                ->update($updates);
        }
    }
}
