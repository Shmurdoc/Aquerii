<?php

namespace App\Modules\HSSE\Services;

use App\Modules\HSSE\Models\Incident;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Builds the MHSA Section 11 reporting payload.
 *
 * Mine Health and Safety Act, 1996 (South Africa), section 11 requires the
 * employer to keep a record of all occupational health and safety incidents
 * and to make these available to the Chief Inspector of Mines on request.
 *
 * The Act classifies reportable incidents as:
 *   A — major incidents (fatality, serious injury, collapse, explosion,
 *       uncontrolled release of hazardous substance)
 *   B — significant incidents (lost-time injury, occupational disease,
 *       damage to plant exceeding threshold)
 *   C — minor incidents (first aid cases, near misses, hazardous
 *       observations)
 *
 * The Inspectorate's annual statistical submission aggregates by
 * classification, type, and mine section.
 */
class MhsaReportService
{
    public function buildSection11Report(
        string $workspaceId,
        ?CarbonInterface $from = null,
        ?CarbonInterface $to = null
    ): array {
        $from ??= now()->subYear();
        $to ??= now();

        $incidents = Incident::where('workspace_id', $workspaceId)
            ->whereNotNull('mhsa_classification')
            ->whereBetween('occurred_at', [$from, $to])
            ->get();

        return [
            'act' => 'Mine Health and Safety Act, 1996',
            'section' => '11',
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'totals' => [
                'all' => $incidents->count(),
                'class_a' => $incidents->where('mhsa_classification', 'A')->count(),
                'class_b' => $incidents->where('mhsa_classification', 'B')->count(),
                'class_c' => $incidents->where('mhsa_classification', 'C')->count(),
                'coida_overlap' => $incidents->where('coida_reportable', true)->count(),
            ],
            'by_classification' => [
                'A' => $this->breakdownForClassification($incidents, 'A'),
                'B' => $this->breakdownForClassification($incidents, 'B'),
                'C' => $this->breakdownForClassification($incidents, 'C'),
            ],
            'by_location' => $this->breakdownByLocation($incidents),
            'open_investigations' => Incident::where('workspace_id', $workspaceId)
                ->whereIn('status', [Incident::STATUS_OPEN, Incident::STATUS_INVESTIGATING])
                ->whereNotNull('mhsa_classification')
                ->count(),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    private function breakdownForClassification(Collection $incidents, string $classification): array
    {
        $filtered = $incidents->where('mhsa_classification', $classification);

        return [
            'count' => $filtered->count(),
            'by_type' => $filtered->groupBy('type')->map->count()->toArray(),
            'by_severity' => $filtered->groupBy('severity')->map->count()->toArray(),
        ];
    }

    private function breakdownByLocation(Collection $incidents): array
    {
        return $incidents
            ->groupBy(fn (Incident $i): string => $i->location ?: 'unspecified')
            ->map(fn (Collection $group, string $location): array => [
                'location' => $location,
                'count' => $group->count(),
                'class_a' => $group->where('mhsa_classification', 'A')->count(),
                'class_b' => $group->where('mhsa_classification', 'B')->count(),
                'class_c' => $group->where('mhsa_classification', 'C')->count(),
            ])
            ->values()
            ->all();
    }
}
