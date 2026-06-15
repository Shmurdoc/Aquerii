<?php

namespace App\Modules\HSSE\Services;

use App\Core\Models\Workspace;
use App\Modules\HSSE\Models\Incident;
use Carbon\CarbonInterface;

/**
 * Generates COIDA W.Cl.2 (Employer's Report of an Occupational Injury / Disease)
 * submission payloads from reportable incidents.
 *
 * COIDA = Compensation for Occupational Injuries and Diseases Act, 1993
 * (South Africa). Section 74 of the Act requires the employer to lodge a
 * W.Cl.2 form with the Compensation Commissioner within 7 days of an
 * occupational injury or disease.
 *
 * This service produces the data the API returns to the client — the actual
 * submission to the Compensation Fund's e-Hearing / u-filing portal is out
 * of scope for this in-app service; the client is expected to render the
 * payload as the official W.Cl.2 PDF or post it to the integration gateway.
 */
class CoidaReportService
{
    public function buildWcl2Payload(Workspace $workspace, Incident $incident): array
    {
        abort_unless(
            $incident->coida_reportable === true,
            422,
            'Incident is not marked as COIDA-reportable. Set coida_reportable=true before generating a W.Cl.2 form.'
        );

        $reporter = $incident->reporter;
        $investigator = $incident->investigator;

        return [
            'form' => 'W.Cl.2',
            'form_version' => '2018',
            'generated_at' => now()->toIso8601String(),
            'workspace' => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
            ],
            'employer' => [
                'name' => $workspace->name,
                'registration_number' => $workspace->settings['coida_registration_number'] ?? null,
                'industry' => $workspace->settings['industry'] ?? null,
            ],
            'incident' => [
                'reference' => $incident->reference,
                'title' => $incident->title,
                'description' => $incident->description,
                'type' => $incident->type,
                'severity' => $incident->severity,
                'occurred_at' => optional($incident->occurred_at)->toIso8601String(),
                'reported_at' => optional($incident->reported_at)->toIso8601String(),
                'location' => $incident->location,
                'location_details' => $incident->location_details,
                'body_part_affected' => $incident->body_part_affected,
                'injury_type' => $incident->injury_type,
                'mhsa_classification' => $incident->mhsa_classification,
                'coida_reference' => $incident->coida_reference,
                'root_cause' => $incident->root_cause,
                'immediate_cause' => $incident->immediate_cause,
                'contributing_factors' => $incident->contributing_factors,
            ],
            'reporter' => $reporter ? [
                'id' => $reporter->id,
                'name' => $reporter->name,
                'email' => $reporter->email,
            ] : null,
            'investigator' => $investigator ? [
                'id' => $investigator->id,
                'name' => $investigator->name,
                'email' => $investigator->email,
            ] : null,
            'submission_deadline' => optional($incident->occurred_at)
                ?->addDays(7)
                ->toIso8601String(),
            'instructions' => [
                'en' => 'Lodge with the Compensation Commissioner within 7 days of the incident. Submit at https://www.labour.gov.za or via your registered u-filing agent.',
                'af' => 'Dien by die Vergoedingskommissaris in binne 7 dae na die voorval in.',
            ],
        ];
    }

    /**
     * Aggregate the reportable incidents for a workspace over a date range.
     * Used for the periodic COIDA submission summary view.
     */
    public function summary(
        string $workspaceId,
        ?CarbonInterface $from = null,
        ?CarbonInterface $to = null
    ): array {
        $from ??= now()->subYear();
        $to ??= now();

        $incidents = Incident::where('workspace_id', $workspaceId)
            ->where('coida_reportable', true)
            ->whereBetween('occurred_at', [$from, $to])
            ->orderBy('occurred_at')
            ->get();

        $byType = $incidents->groupBy('type')->map->count();
        $bySeverity = $incidents->groupBy('severity')->map->count();

        return [
            'period' => [
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
            ],
            'total' => $incidents->count(),
            'by_type' => $byType,
            'by_severity' => $bySeverity,
            'fatalities' => $incidents->where('type', Incident::TYPE_FATALITY)->count(),
            'lost_time' => $incidents->where('type', Incident::TYPE_LOST_TIME)->count(),
            'incidents' => $incidents->map(fn (Incident $i): array => [
                'id' => $i->id,
                'reference' => $i->reference,
                'type' => $i->type,
                'severity' => $i->severity,
                'occurred_at' => optional($i->occurred_at)->toIso8601String(),
                'coida_reference' => $i->coida_reference,
            ])->values()->all(),
        ];
    }
}
