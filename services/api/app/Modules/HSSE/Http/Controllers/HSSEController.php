<?php

namespace App\Modules\HSSE\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\HSSE\Models\Hazard;
use App\Modules\HSSE\Models\Incident;
use App\Modules\HSSE\Services\CoidaReportService;
use App\Modules\HSSE\Services\MhsaReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HSSEController extends Controller
{
    public function __construct(
        private CoidaReportService $coida,
        private MhsaReportService $mhsa,
    ) {}

    public function dashboard(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $incidents = Incident::where('workspace_id', $workspace->id);
        $hazards = Hazard::where('workspace_id', $workspace->id);

        $days = (int) $request->query('days', 30);
        $since = now()->subDays($days);

        $stats = [
            'period_days' => $days,
            'incidents' => [
                'total' => (clone $incidents)->count(),
                'open' => (clone $incidents)->where('status', Incident::STATUS_OPEN)->count(),
                'investigating' => (clone $incidents)->where('status', Incident::STATUS_INVESTIGATING)->count(),
                'closed' => (clone $incidents)->where('status', Incident::STATUS_CLOSED)->count(),
                'in_period' => (clone $incidents)->where('occurred_at', '>=', $since)->count(),
                'by_severity' => (clone $incidents)
                    ->selectRaw('severity, count(*) as count')
                    ->groupBy('severity')
                    ->pluck('count', 'severity'),
                'by_type' => (clone $incidents)
                    ->selectRaw('type, count(*) as count')
                    ->groupBy('type')
                    ->pluck('count', 'type'),
                'coida_reportable' => (clone $incidents)->where('coida_reportable', true)->count(),
                'fatalities' => (clone $incidents)->where('type', Incident::TYPE_FATALITY)->count(),
                'mhsa_class_a' => (clone $incidents)->where('mhsa_classification', 'A')->count(),
            ],
            'hazards' => [
                'total' => (clone $hazards)->count(),
                'open' => (clone $hazards)->whereIn('status', [
                    Hazard::STATUS_IDENTIFIED, Hazard::STATUS_ASSESSED, Hazard::STATUS_CONTROLLED,
                ])->count(),
                'by_risk_level' => (clone $hazards)
                    ->selectRaw('risk_level, count(*) as count')
                    ->groupBy('risk_level')
                    ->pluck('count', 'risk_level'),
                'extreme_risk' => (clone $hazards)->where('risk_level', Hazard::RISK_EXTREME)->count(),
            ],
            'generated_at' => now()->toIso8601String(),
        ];

        return response()->json(['data' => $stats]);
    }

    public function coidaIncident(Request $request, Workspace $workspace, Incident $incident): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists()
                && $incident->workspace_id === $workspace->id,
            404
        );

        $payload = $this->coida->buildWcl2Payload($workspace, $incident);

        return response()->json(['data' => $payload]);
    }

    public function coidaSummary(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $from = $request->query('from') ? Carbon::parse($request->query('from')) : null;
        $to = $request->query('to') ? Carbon::parse($request->query('to')) : null;

        $summary = $this->coida->summary($workspace->id, $from, $to);

        return response()->json(['data' => $summary]);
    }

    public function mhsaReport(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $from = $request->query('from') ? Carbon::parse($request->query('from')) : null;
        $to = $request->query('to') ? Carbon::parse($request->query('to')) : null;

        $report = $this->mhsa->buildSection11Report($workspace->id, $from, $to);

        return response()->json(['data' => $report]);
    }
}
