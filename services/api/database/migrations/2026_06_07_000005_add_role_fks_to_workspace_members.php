<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Adds position_id and department_role_id foreign keys to workspace_members,
 * backfilling them from the existing free-form `job_title` and `department`
 * VARCHAR columns by matching to the system roles seeded in
 * config/aquerii-roles.php.
 *
 * The legacy `job_title` and `department` columns are KEPT for read-only
 * backward compatibility — they will not be dropped in this migration.
 *
 * NOTE: The Spatie `roles` table uses bigIncrements('id') (BIGINT), not UUID,
 * so the FK columns must be unsignedBigInteger to match. Despite the original
 * task spec wording "UUID nullable FK", only bigint will type-check against
 * roles.id. The mapping in $this->backfill() does the actual work.
 */
return new class extends Migration
{
    /**
     * Mapping of legacy free-form job_title strings → system role slug
     * (matches a row in the seeded `roles` table by name).
     *
     * Keys are lowercased for case-insensitive matching.
     * Values are the Spatie role `name` (which is the slug from
     * config/aquerii-roles.php, e.g. 'pos-manager').
     */
    private array $positionMap = [
        // pos-team-member (L1)
        'team member' => 'pos-team-member',
        'operator' => 'pos-team-member',
        'worker' => 'pos-team-member',
        'crew' => 'pos-team-member',
        'labourer' => 'pos-team-member',
        'laborer' => 'pos-team-member',
        'driver' => 'pos-team-member',

        // pos-senior (L3)
        'senior' => 'pos-senior',
        'safety officer' => 'pos-senior',
        'hsse officer' => 'pos-senior',
        'engineer' => 'pos-senior',
        'senior engineer' => 'pos-senior',
        'specialist' => 'pos-senior',
        'analyst' => 'pos-senior',

        // pos-lead (L4)
        'lead' => 'pos-lead',
        'team lead' => 'pos-lead',
        'tech lead' => 'pos-lead',

        // pos-supervisor (L5)
        'supervisor' => 'pos-supervisor',
        'shift supervisor' => 'pos-supervisor',
        'foreman' => 'pos-supervisor',

        // pos-manager (L6)
        'manager' => 'pos-manager',
        'mine manager' => 'pos-manager',
        'operations manager' => 'pos-manager',
        'project manager' => 'pos-manager',
        'site manager' => 'pos-manager',
        'plant manager' => 'pos-manager',

        // pos-senior-manager (L7)
        'senior manager' => 'pos-senior-manager',
        'general manager' => 'pos-senior-manager',

        // pos-director (L8)
        'director' => 'pos-director',
        'head of' => 'pos-director',

        // pos-executive (L8+)
        'executive' => 'pos-executive',
        'ceo' => 'pos-executive',
        'cfo' => 'pos-executive',
        'coo' => 'pos-executive',
        'chief' => 'pos-executive',
        'president' => 'pos-executive',
    ];

    /**
     * Mapping of legacy free-form department strings → system role slug.
     */
    private array $departmentMap = [
        'operations' => 'employee-operations',
        'production' => 'employee-operations',
        'logistics' => 'employee-operations',
        'supply chain' => 'employee-operations',
        'scheduling' => 'employee-operations',

        'hsse' => 'employee-safety',
        'safety' => 'employee-safety',
        'safety / hsse' => 'employee-safety',
        'health & safety' => 'employee-safety',
        'environment' => 'employee-safety',
        'security' => 'employee-safety',

        'engineering' => 'employee-engineering',
        'maintenance' => 'employee-engineering',
        'reliability' => 'employee-engineering',
        'technical' => 'employee-engineering',

        'finance & admin' => 'employee-finance-admin',
        'finance' => 'employee-finance-admin',
        'admin' => 'employee-finance-admin',
        'finance and admin' => 'employee-finance-admin',
        'human resources' => 'employee-finance-admin',
        'hr' => 'employee-finance-admin',
        'it' => 'employee-finance-admin',
        'accounting' => 'employee-finance-admin',

        'contractors & visitors' => 'employee-contractors-visitors',
        'contractors' => 'employee-contractors-visitors',
        'contractor' => 'employee-contractors-visitors',
        'visitors' => 'employee-contractors-visitors',
        'visitor' => 'employee-contractors-visitors',
        'external' => 'employee-contractors-visitors',
    ];

    public function up(): void
    {
        Schema::table('workspace_members', function (Blueprint $table) {
            if (! Schema::hasColumn('workspace_members', 'position_id')) {
                $table->unsignedBigInteger('position_id')->nullable()->after('department');
                $table->index('position_id');
            }

            if (! Schema::hasColumn('workspace_members', 'department_role_id')) {
                $table->unsignedBigInteger('department_role_id')->nullable()->after('position_id');
                $table->index('department_role_id');
            }
        });

        // FK constraints are added separately so we can guard against the
        // roles table not existing yet (e.g. if migrations ran out of order
        // or the seeder was skipped).
        if (Schema::hasTable('roles')) {
            $this->addForeignKeys();
            $this->backfill();
        } else {
            Log::warning('workspace_members role FK migration: roles table not found; skipping FK constraints and backfill.');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('roles')) {
            Schema::table('workspace_members', function (Blueprint $table) {
                $table->dropForeign(['position_id']);
                $table->dropForeign(['department_role_id']);
            });
        }

        Schema::table('workspace_members', function (Blueprint $table) {
            if (Schema::hasColumn('workspace_members', 'position_id')) {
                $table->dropIndex(['position_id']);
                $table->dropColumn('position_id');
            }

            if (Schema::hasColumn('workspace_members', 'department_role_id')) {
                $table->dropIndex(['department_role_id']);
                $table->dropColumn('department_role_id');
            }
        });
    }

    private function addForeignKeys(): void
    {
        $driver = DB::getDriverName();

        // RESTRICT — we never want to delete a role that is still referenced
        // by a member. Roles must be unassigned first.
        $onDelete = 'RESTRICT';

        // Postgres handles RESTRICT natively; for sqlite (used in unit tests)
        // we fall back to NO ACTION which is equivalent at the application layer.
        if ($driver === 'sqlite') {
            $onDelete = 'NO ACTION';
        }

        $positionFk = 'workspace_members_position_id_foreign';
        $deptFk = 'workspace_members_department_role_id_foreign';

        $existing = collect(DB::select(
            $driver === 'pgsql'
                ? 'SELECT conname FROM pg_constraint WHERE conname IN (?, ?)'
                : "SELECT name FROM sqlite_master WHERE type = 'index' AND name IN (?, ?)",
            [$positionFk, $deptFk]
        ))->pluck($driver === 'pgsql' ? 'conname' : 'name')->all();

        if (! in_array($positionFk, $existing, true)) {
            Schema::table('workspace_members', function (Blueprint $table) use ($onDelete) {
                $table->foreign('position_id', 'workspace_members_position_id_foreign')
                    ->references('id')->on('roles')
                    ->onDelete($onDelete);
            });
        }

        if (! in_array($deptFk, $existing, true)) {
            Schema::table('workspace_members', function (Blueprint $table) use ($onDelete) {
                $table->foreign('department_role_id', 'workspace_members_department_role_id_foreign')
                    ->references('id')->on('roles')
                    ->onDelete($onDelete);
            });
        }
    }

    /**
     * Backfill position_id and department_role_id from the legacy free-form
     * columns. Uses raw SQL (project convention) so the backfill is a single
     * UPDATE that resolves to a SELECT in the same statement.
     *
     * Best-effort: if a free-form value has no matching role, the FK stays
     * NULL and a warning is logged with the user_id and value for follow-up.
     */
    private function backfill(): void
    {
        $positionMap = $this->positionMap;
        $departmentMap = $this->departmentMap;

        // Pre-resolve each role slug → id once. Missing roles are skipped
        // (we still update the rest of the rows).
        $positionIds = $this->resolveRoleIds(array_values($positionMap));
        $departmentIds = $this->resolveRoleIds(array_values($departmentMap));

        // Build a CASE expression for positions: every key in $positionMap
        // is a LOWER(TRIM(job_title)) value to look up; the corresponding
        // value is the role slug, which we translate to id via $positionIds.
        $positionCases = [];
        foreach ($positionMap as $needle => $slug) {
            if (! isset($positionIds[$slug])) {
                continue;
            }
            $positionCases[] = 'WHEN LOWER(TRIM(job_title)) = '.$this->quote($needle)
                .' THEN '.(int) $positionIds[$slug];
        }

        $departmentCases = [];
        foreach ($departmentMap as $needle => $slug) {
            if (! isset($departmentIds[$slug])) {
                continue;
            }
            $departmentCases[] = 'WHEN LOWER(TRIM(department)) = '.$this->quote($needle)
                .' THEN '.(int) $departmentIds[$slug];
        }

        $posCount = 0;
        $deptCount = 0;
        $unmatchedPositions = [];
        $unmatchedDepartments = [];

        if (! empty($positionCases)) {
            $sql = 'UPDATE workspace_members
                    SET position_id = CASE '.implode(' ', $positionCases).' ELSE position_id END
                    WHERE position_id IS NULL
                      AND job_title IS NOT NULL
                      AND TRIM(job_title) <> \'\'';

            $posCount = DB::affectingStatement($sql);

            // Find rows that still have a job_title but no position_id —
            // those are the ones we could not map.
            $unmatchedPositions = DB::table('workspace_members')
                ->whereNull('position_id')
                ->whereNotNull('job_title')
                ->whereRaw('TRIM(job_title) <> \'\'')
                ->select('user_id', 'workspace_id', 'job_title')
                ->get()
                ->all();
        }

        if (! empty($departmentCases)) {
            $sql = 'UPDATE workspace_members
                    SET department_role_id = CASE '.implode(' ', $departmentCases).' ELSE department_role_id END
                    WHERE department_role_id IS NULL
                      AND department IS NOT NULL
                      AND TRIM(department) <> \'\'';

            $deptCount = DB::affectingStatement($sql);

            $unmatchedDepartments = DB::table('workspace_members')
                ->whereNull('department_role_id')
                ->whereNotNull('department')
                ->whereRaw('TRIM(department) <> \'\'')
                ->select('user_id', 'workspace_id', 'department')
                ->get()
                ->all();
        }

        Log::info("workspace_members role FK backfill: position_id set on {$posCount} row(s), department_role_id set on {$deptCount} row(s).");

        foreach ($unmatchedPositions as $row) {
            Log::warning("workspace_members role FK backfill: unmatched job_title for user {$row->user_id} (workspace {$row->workspace_id}): '{$row->job_title}' — position_id left NULL.");
        }

        foreach ($unmatchedDepartments as $row) {
            Log::warning("workspace_members role FK backfill: unmatched department for user {$row->user_id} (workspace {$row->workspace_id}): '{$row->department}' — department_role_id left NULL.");
        }
    }

    /**
     * Return a map of role slug → id for the given slugs, querying the
     * seeded `roles` table. Slugs that do not exist in the table are
     * omitted from the returned array.
     */
    private function resolveRoleIds(array $slugs): array
    {
        $slugs = array_values(array_unique(array_filter($slugs)));

        if (empty($slugs)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($slugs), '?'));
        $rows = DB::select("SELECT id, name FROM roles WHERE name IN ({$placeholders})", $slugs);

        $out = [];
        foreach ($rows as $row) {
            $out[$row->name] = (int) $row->id;
        }

        return $out;
    }

    private function quote(string $value): string
    {
        // SQL string literal: escape single quotes, wrap in single quotes.
        return "'".str_replace("'", "''", $value)."'";
    }
};
