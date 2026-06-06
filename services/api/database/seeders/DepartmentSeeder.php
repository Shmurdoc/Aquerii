<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

/**
 * Loads and validates the role taxonomy from config/aquerii-roles.php and
 * reports the resolved role graph. Acts as a config-driven companion to
 * RolePermissionSeeder.
 *
 * RolePermissionSeeder writes the rows; DepartmentSeeder documents and
 * validates the taxonomy that produced them. The two seeders are
 * intentionally decoupled so that a future migration that introduces a
 * dedicated `departments` table can be wired in here without touching the
 * Spatie roles.
 */
class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $taxonomy = config('aquerii-roles');

        if (! is_array($taxonomy)) {
            throw new \RuntimeException(
                'config/aquerii-roles.php is missing or malformed. '
                .'DepartmentSeeder cannot run without the role taxonomy.'
            );
        }

        $departments = $taxonomy['departments'] ?? [];
        $positions = $taxonomy['positions'] ?? [];
        $tiers = $taxonomy['tiers'] ?? [];

        $this->validateUniqueSlugs($departments, $positions, $tiers);

        $this->command->info(sprintf(
            'Role taxonomy: %d departments, %d positions, %d tiers (total %d slugs).',
            count($departments),
            count($positions),
            count($tiers),
            count($departments) + count($positions) + count($tiers)
        ));

        $this->command->newLine();
        $this->command->line('  Departments:');
        foreach ($departments as $entry) {
            $this->command->line(sprintf('    - %-32s %s', $entry['slug'], $entry['name']));
        }

        $this->command->newLine();
        $this->command->line('  Positions:');
        foreach ($positions as $entry) {
            $level = $entry['level'] ?? '?';
            $this->command->line(sprintf('    - %-32s %-7s %s', $entry['slug'], $level, $entry['name']));
        }

        $this->command->newLine();
        $this->command->line('  Tiers:');
        foreach ($tiers as $entry) {
            $this->command->line(sprintf('    - %-32s %s', $entry['slug'], $entry['name']));
        }

        $guardName = config('auth.defaults.guard', 'web');
        $expectedSlugs = array_merge(
            array_column($departments, 'slug'),
            array_column($positions, 'slug'),
            array_column($tiers, 'slug'),
        );

        $existingSlugs = Role::query()
            ->where('guard_name', $guardName)
            ->whereIn('name', $expectedSlugs)
            ->pluck('name')
            ->all();

        $missing = array_diff($expectedSlugs, $existingSlugs);

        $this->command->newLine();
        if (empty($missing)) {
            $this->command->info('All 16 taxonomy roles are present in the Spatie roles table.');
        } else {
            $this->command->warn(sprintf(
                '%d taxonomy roles are missing from the Spatie roles table: %s. '
                .'Run RolePermissionSeeder first.',
                count($missing),
                implode(', ', $missing)
            ));
        }
    }

    /**
     * @param  array<int, array{slug: string, name: string}>  $departments
     * @param  array<int, array{slug: string, name: string, level: string}>  $positions
     * @param  array<int, array{slug: string, name: string}>  $tiers
     */
    private function validateUniqueSlugs(array $departments, array $positions, array $tiers): void
    {
        $allSlugs = array_merge(
            array_column($departments, 'slug'),
            array_column($positions, 'slug'),
            array_column($tiers, 'slug'),
        );

        $duplicates = array_keys(array_filter(array_count_values($allSlugs), fn ($n) => $n > 1));

        if (! empty($duplicates)) {
            throw new \RuntimeException(
                'config/aquerii-roles.php contains duplicate slugs: '.implode(', ', $duplicates)
            );
        }
    }
}
