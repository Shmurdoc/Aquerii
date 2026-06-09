<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\PortalToken;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\CompetencyType;
use App\Modules\CRM\Models\CrmCompany;
use App\Services\ComplianceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ClientPortalController extends Controller
{
    public function __construct(
        private readonly ComplianceService $complianceService
    ) {}

    public function generateToken(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
        ]);

        $plaintext = 'portal_'.Str::random(60);
        $hash = hash('sha256', $plaintext);

        $token = PortalToken::create([
            'workspace_id' => $workspace->id,
            'label' => $validated['label'],
            'token_hash' => $hash,
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        return response()->json([
            'token' => $plaintext,
            'expires_at' => $token->expires_at->toIso8601String(),
        ]);
    }

    public function contractors(Request $request, Workspace $workspace): JsonResponse
    {
        $token = $this->validateToken($request, $workspace);
        if ($token instanceof JsonResponse) {
            return $token;
        }

        $companies = CrmCompany::where('workspace_id', $workspace->id)->get();
        $members = $workspace->members()
            ->with(['user', 'company'])
            ->get();

        $result = $companies->map(function (CrmCompany $company) use ($members, $workspace) {
            $companyMembers = $members->where('company_id', $company->id);
            $total = $companyMembers->count();
            $compliant = 0;

            foreach ($companyMembers as $worker) {
                $status = $this->complianceService->calculateWorkerStatus($worker);
                if ($status === 'compliant') {
                    $compliant++;
                }
            }

            $expiringCertsCount = $this->countExpiringCertsForCompany($workspace, $company, $companyMembers->pluck('user_id'));

            return [
                'company_id' => $company->id,
                'company_name' => $company->name,
                'worker_count' => $total,
                'compliant_count' => $compliant,
                'compliance_rate' => $total > 0 ? round(($compliant / $total) * 100, 1) : 0.0,
                'equipment_count' => 0,
                'equipment_compliance_rate' => 0.0,
                'expiring_certs_count' => $expiringCertsCount,
            ];
        });

        return response()->json(['data' => $result]);
    }

    public function workers(Request $request, Workspace $workspace, string $companyId): JsonResponse
    {
        $token = $this->validateToken($request, $workspace);
        if ($token instanceof JsonResponse) {
            return $token;
        }

        $company = CrmCompany::where('workspace_id', $workspace->id)
            ->where('id', $companyId)
            ->first();

        if ($company === null) {
            return response()->json(['error' => 'Not found.'], 404);
        }

        $workers = $workspace->members()
            ->where('company_id', $companyId)
            ->with(['user'])
            ->get()
            ->map(function (WorkspaceMember $worker) use ($workspace) {
                $status = $this->complianceService->calculateWorkerStatus($worker);
                $expiringCerts = $this->getWorkerExpiringCerts($workspace, $worker->user_id);

                return [
                    'worker_id' => $worker->id,
                    'name' => $worker->user?->name ?? 'Unknown',
                    'badge_id' => $worker->badge_id,
                    'compliance_status' => $status,
                    'expiring_certs' => $expiringCerts,
                ];
            });

        return response()->json(['data' => $workers]);
    }

    public function heatmap(Request $request, Workspace $workspace): JsonResponse
    {
        $token = $this->validateToken($request, $workspace);
        if ($token instanceof JsonResponse) {
            return $token;
        }

        $now = Carbon::now();
        $in30d = $now->copy()->addDays(30);
        $in7d = $now->copy()->addDays(7);

        $companies = CrmCompany::where('workspace_id', $workspace->id)->get();
        $certTypes = CompetencyType::where('workspace_id', $workspace->id)->get();

        $result = $companies->map(function (CrmCompany $company) use ($workspace, $now, $in30d, $in7d, $certTypes) {
            $userIds = $workspace->members()
                ->where('company_id', $company->id)
                ->pluck('user_id');

            $certTypeData = $certTypes->map(function (CompetencyType $type) use ($workspace, $userIds, $now, $in30d, $in7d) {
                $records = CompetencyRecord::where('workspace_id', $workspace->id)
                    ->where('competency_type_id', $type->id)
                    ->whereIn('user_id', $userIds)
                    ->get();

                $expired = 0;
                $expiring7d = 0;
                $expiring30d = 0;

                foreach ($records as $r) {
                    if ($r->expires_at === null) {
                        continue;
                    }
                    if ($r->expires_at < $now) {
                        $expired++;
                    } elseif ($r->expires_at <= $in7d) {
                        $expiring7d++;
                    } elseif ($r->expires_at <= $in30d) {
                        $expiring30d++;
                    }
                }

                return [
                    'type_name' => $type->name,
                    'expiring_30d' => $expiring30d,
                    'expiring_7d' => $expiring7d,
                    'expired' => $expired,
                ];
            });

            return [
                'company_id' => $company->id,
                'company_name' => $company->name,
                'cert_types' => $certTypeData,
            ];
        });

        return response()->json(['data' => ['contractors' => $result]]);
    }

    public function export(Request $request, Workspace $workspace): JsonResponse
    {
        $token = $this->validateToken($request, $workspace);
        if ($token instanceof JsonResponse) {
            return $token;
        }

        $companies = CrmCompany::where('workspace_id', $workspace->id)->get();
        $members = $workspace->members()->with(['user', 'company'])->get();

        $data = $companies->map(function (CrmCompany $company) use ($members) {
            $companyMembers = $members->where('company_id', $company->id);
            $total = $companyMembers->count();
            $compliantCount = 0;
            $workerDetails = [];

            foreach ($companyMembers as $worker) {
                $status = $this->complianceService->calculateWorkerStatus($worker);
                if ($status === 'compliant') {
                    $compliantCount++;
                }
                $workerDetails[] = [
                    'name' => $worker->user?->name ?? 'Unknown',
                    'badge_id' => $worker->badge_id,
                    'status' => $status,
                ];
            }

            return [
                'company_name' => $company->name,
                'worker_count' => $total,
                'compliant_count' => $compliantCount,
                'compliance_rate' => $total > 0 ? round(($compliantCount / $total) * 100, 1) : 0.0,
                'workers' => $workerDetails,
            ];
        });

        return response()->json([
            'data' => [
                'workspace_name' => $workspace->name,
                'generated_at' => Carbon::now()->toIso8601String(),
                'contractors' => $data,
            ],
        ]);
    }

    private function validateToken(Request $request, Workspace $workspace): ?JsonResponse
    {
        $token = $request->query('token');
        if ($token === null) {
            return response()->json(['error' => 'Missing token.'], 401);
        }

        $hash = hash('sha256', $token);

        $record = PortalToken::where('token_hash', $hash)
            ->where('workspace_id', $workspace->id)
            ->first();

        if ($record === null) {
            return response()->json(['error' => 'Invalid token.'], 401);
        }

        if (! $record->isValid()) {
            return response()->json(['error' => 'Token expired.'], 401);
        }

        return null;
    }

    private function countExpiringCertsForCompany(Workspace $workspace, CrmCompany $company, $userIds): int
    {
        $now = Carbon::now();
        $thirtyDays = $now->copy()->addDays(30);

        $cofExpiring = CofRecord::where('workspace_id', $workspace->id)
            ->whereIn('user_id', $userIds)
            ->where('status', 'active')
            ->where('expires_at', '<=', $thirtyDays)
            ->where('expires_at', '>', $now)
            ->count();

        $certExpiring = CompetencyRecord::where('workspace_id', $workspace->id)
            ->whereIn('user_id', $userIds)
            ->where('status', 'active')
            ->where('expires_at', '<=', $thirtyDays)
            ->where('expires_at', '>', $now)
            ->count();

        return $cofExpiring + $certExpiring;
    }

    private function getWorkerExpiringCerts(Workspace $workspace, string $userId): array
    {
        $now = Carbon::now();
        $thirtyDays = $now->copy()->addDays(30);

        $cofs = CofRecord::where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->where('expires_at', '<=', $thirtyDays)
            ->where('expires_at', '>', $now)
            ->get()
            ->map(fn (CofRecord $r) => [
                'type' => 'cof',
                'name' => 'Certificate of Fitness',
                'expires_at' => $r->expires_at->toDateString(),
            ]);

        $certs = CompetencyRecord::where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->where('expires_at', '<=', $thirtyDays)
            ->where('expires_at', '>', $now)
            ->with('competencyType')
            ->get()
            ->map(fn (CompetencyRecord $r) => [
                'type' => 'competency',
                'name' => $r->competencyType?->name ?? 'Unknown',
                'expires_at' => $r->expires_at->toDateString(),
            ]);

        return $cofs->concat($certs)->values()->toArray();
    }
}
