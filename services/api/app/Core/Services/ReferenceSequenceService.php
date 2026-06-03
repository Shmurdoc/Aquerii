<?php

namespace App\Core\Services;

use App\Modules\HSSE\Models\CorrectiveAction;
use App\Modules\HSSE\Models\Hazard;
use App\Modules\HSSE\Models\Incident;
use App\Modules\PTW\Models\Permit;
use Illuminate\Support\Facades\DB;

/**
 * Atomic per-workspace, per-year, per-entity reference generator.
 *
 * Replaces the old `count() + 1` pattern that was vulnerable to a TOCTOU race:
 * two concurrent inserts would compute the same next reference, and the second
 * would fail the unique constraint with a 500.
 *
 * Concurrency is enforced by wrapping the read-and-increment in a transaction
 * with `lockForUpdate()`. PostgreSQL row locks serialise the lookup, so each
 * caller observes a strictly increasing `last_value`.
 */
class ReferenceSequenceService
{
    public const ENTITY_INCIDENT = 'incident';

    public const ENTITY_HAZARD = 'hazard';

    public const ENTITY_CORRECTIVE_ACTION = 'corrective_action';

    public const ENTITY_PERMIT = 'permit';

    public function next(string $workspaceId, string $entity): string
    {
        $year = (int) now()->format('Y');
        $prefix = $this->prefixFor($entity);

        $value = DB::transaction(function () use ($workspaceId, $entity, $year): int {
            $row = DB::table('hsse_reference_counters')
                ->where('workspace_id', $workspaceId)
                ->where('entity', $entity)
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if ($row === null) {
                DB::table('hsse_reference_counters')->insert([
                    'workspace_id' => $workspaceId,
                    'entity' => $entity,
                    'year' => $year,
                    'last_value' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return 1;
            }

            DB::table('hsse_reference_counters')
                ->where('workspace_id', $workspaceId)
                ->where('entity', $entity)
                ->where('year', $year)
                ->update([
                    'last_value' => DB::raw('last_value + 1'),
                    'updated_at' => now(),
                ]);

            return $row->last_value + 1;
        });

        return sprintf('%s-%d-%04d', $prefix, $year, $value);
    }

    public function prefixFor(string $entity): string
    {
        return match ($entity) {
            self::ENTITY_INCIDENT => 'INC',
            self::ENTITY_HAZARD => 'HAZ',
            self::ENTITY_CORRECTIVE_ACTION => 'CA',
            self::ENTITY_PERMIT => 'PTW',
            default => throw new \InvalidArgumentException("Unknown entity: {$entity}"),
        };
    }

    public function entityFor(string $modelClass): string
    {
        return match ($modelClass) {
            Incident::class => self::ENTITY_INCIDENT,
            Hazard::class => self::ENTITY_HAZARD,
            CorrectiveAction::class => self::ENTITY_CORRECTIVE_ACTION,
            Permit::class => self::ENTITY_PERMIT,
            default => throw new \InvalidArgumentException("Unknown model: {$modelClass}"),
        };
    }
}
