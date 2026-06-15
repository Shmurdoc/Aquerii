<?php

namespace App\Http\Controllers\Api;

use App\Core\Models\Workspace;
use App\Http\Controllers\Controller;
use App\Models\PortalToken;
use App\Modules\Equipment\Models\EquipmentCertRecord;
use App\Modules\Equipment\Models\EquipmentCertType;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PortalController extends Controller
{
    private function resolveWorkspace(string $token): Workspace
    {
        $portalToken = PortalToken::where('token', $token)->first();

        abort_if(!$portalToken, 404, 'Portal token not found.');

        if ($portalToken->expires_at && $portalToken->expires_at->isPast()) {
            abort(410, 'Portal token has expired.');
        }

        $workspace = Workspace::find($portalToken->workspace_id);
        abort_if(!$workspace, 404, 'Workspace not found.');

        return $workspace;
    }

    public function summary(string $token): JsonResponse
    {
        $workspace = $this->resolveWorkspace($token);

        $contractors = DB::table('crm_companies')
            ->where('workspace_id', $workspace->id)
            ->orderBy('name')
            ->get();

        $allEquipmentIds = EquipmentCertRecord::where('workspace_id', $workspace->id)
            ->distinct('equipment_id')
            ->pluck('equipment_id');

        $totalEquipment = $allEquipmentIds->count();
        $compliantEquipment = EquipmentCertRecord::where('workspace_id', $workspace->id)
            ->where('status', 'valid')
            ->distinct('equipment_id')
            ->count();

        $totalWorkers = DB::table('workspace_members')
            ->where('workspace_id', $workspace->id)
            ->where('status', 'active')
            ->count();

        $contractorData = $contractors->map(function ($company) use ($workspace) {
            return [
                'id' => $company->id,
                'company_name' => $company->name,
                'total_workers' => 0,
                'compliant_workers' => 0,
                'compliance_rate' => 0,
                'total_equipment' => 0,
                'compliant_equipment' => 0,
                'equipment_compliance_rate' => 0,
                'expiring_certs_count' => 0,
            ];
        });

        return response()->json([
            'data' => [
                'workspace_name' => $workspace->name,
                'workspace_logo_url' => $workspace->logo_url,
                'generated_at' => now()->toIso8601String(),
                'total_contractors' => $contractors->count(),
                'total_workers' => $totalWorkers,
                'overall_compliance_rate' => 0,
                'equipment_compliance_rate' => $totalEquipment > 0
                    ? round(($compliantEquipment / $totalEquipment) * 100, 1) : 0,
                'contractors' => $contractorData,
            ],
        ]);
    }

    public function contractorWorkers(string $token, string $contractorId): JsonResponse
    {
        $workspace = $this->resolveWorkspace($token);

        $members = DB::table('workspace_members')
            ->join('users', 'workspace_members.user_id', '=', 'users.id')
            ->where('workspace_members.workspace_id', $workspace->id)
            ->where('workspace_members.status', 'active')
            ->select(
                'users.id',
                'users.name',
                'workspace_members.job_title',
                'workspace_members.role',
            )
            ->orderBy('users.name')
            ->get();

        $workers = $members->map(function ($member) {
            return [
                'id' => $member->id,
                'name' => $member->name,
                'badge_id' => null,
                'role' => $member->job_title ?? $member->role,
                'overall_status' => 'compliant',
                'certifications' => [],
            ];
        });

        return response()->json(['data' => $workers]);
    }

    public function heatmap(string $token): JsonResponse
    {
        $workspace = $this->resolveWorkspace($token);

        $certTypes = EquipmentCertType::where('workspace_id', $workspace->id)
            ->pluck('name', 'id');

        $companies = DB::table('crm_companies')
            ->where('workspace_id', $workspace->id)
            ->orderBy('name')
            ->get();

        $allRecords = EquipmentCertRecord::where('workspace_id', $workspace->id)
            ->get()
            ->groupBy('cert_type_id');

        $rows = $companies->map(function ($company) use ($certTypes, $allRecords) {
            $cells = $certTypes->map(function ($name, $typeId) use ($allRecords) {
                $records = $allRecords->get($typeId, collect());
                $count = $records->count();

                $latest = $records->sortByDesc('created_at')->first();
                $status = 'current';
                if ($latest && $latest->expires_at) {
                    if ($latest->expires_at->isPast()) {
                        $status = 'expired';
                    } elseif ($latest->expires_at->diffInDays(now()) <= 30) {
                        $status = 'expiring';
                    }
                }

                return [
                    'cert_name' => $name,
                    'status' => $count > 0 ? $status : 'current',
                    'count' => $count,
                ];
            })->values();

            return [
                'contractor_id' => $company->id,
                'contractor_name' => $company->name,
                'cells' => $cells,
            ];
        });

        return response()->json([
            'data' => [
                'cert_types' => $certTypes->values()->toArray(),
                'rows' => $rows,
            ],
        ]);
    }

    public function export(string $token)
    {
        $workspace = $this->resolveWorkspace($token);

        $types = EquipmentCertType::where('workspace_id', $workspace->id)->get();
        $rows = '';
        foreach ($types as $type) {
            $count = EquipmentCertRecord::where('workspace_id', $workspace->id)
                ->where('cert_type_id', $type->id)
                ->count();
            $rows .= '<tr><td>'.htmlspecialchars($type->name).'</td>'
                .'<td>'.($type->required ? 'Required' : 'Optional').'</td>'
                .'<td>'.$count.'</td></tr>';
        }

        $html = '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Compliance Report</title>
<style>
body{font-family:sans-serif;font-size:12px;}
h1{font-size:18px;}table{width:100%;border-collapse:collapse;margin-top:12px;}
th,td{border:1px solid #ccc;padding:6px;text-align:left;}th{background:#f5f5f5;}
</style></head>
<body>
<h1>Compliance Report</h1>
<p>Workspace: '.htmlspecialchars($workspace->name).'</p>
<p>Generated: '.now()->format('Y-m-d H:i:s').'</p>
<table><thead><tr><th>Cert Type</th><th>Requirement</th><th>Count</th></tr></thead><tbody>'
            .$rows.
        '</tbody></table></body></html>';

        return response($html, 200)
            ->header('Content-Type', 'text/html')
            ->header('Content-Disposition', 'attachment; filename="compliance-report-'.$workspace->id.'.html"');
    }
}
