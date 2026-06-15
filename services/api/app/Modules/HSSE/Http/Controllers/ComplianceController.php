<?php

namespace App\Modules\HSSE\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComplianceController extends Controller
{
    public function dashboard(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $members = DB::table('workspace_members')
            ->join('users', 'workspace_members.user_id', '=', 'users.id')
            ->where('workspace_members.workspace_id', $workspace->id)
            ->where('workspace_members.status', 'active')
            ->select(
                'users.id',
                'users.name',
                'users.avatar_url',
                'workspace_members.role',
                'workspace_members.job_title',
            )
            ->get();

        $totalWorkers = $members->count();

        $now = now();
        $cofRecords = DB::table('competency_cofs')
            ->whereIn('user_id', $members->pluck('id'))
            ->get()
            ->keyBy('id');

        $certData = DB::table('competency_records')
            ->whereIn('user_id', $members->pluck('id'))
            ->whereNotNull('expires_at')
            ->select('user_id', 'expires_at')
            ->get()
            ->groupBy('user_id');

        $compliant = 0;
        $expiringSoon = 0;
        $nonCompliant = 0;
        $unknown = 0;
        $distribution = ['compliant' => 0, 'expiring' => 0, 'non_compliant' => 0, 'unknown' => 0];

        $workers = [];

        foreach ($members as $member) {
            $certs = isset($certData[$member->id]) ? $certData[$member->id] : collect();
            $hasExpired = $certs->contains(fn ($c) => Carbon::parse($c->expires_at)->isPast());
            $hasExpiring = $certs->contains(function ($c) use ($now) {
                $exp = Carbon::parse($c->expires_at);
                return $exp->isFuture() && $exp->diffInDays($now) <= 30;
            });
            $hasValid = $certs->contains(fn ($c) => Carbon::parse($c->expires_at)->isFuture());
            $hasCerts = $certs->isNotEmpty();

            $status = match (true) {
                $hasExpired => 'non_compliant',
                $hasExpiring => 'expiring',
                $hasValid => 'compliant',
                default => 'unknown',
            };

            $distribution[$status]++;
            match ($status) {
                'compliant' => $compliant++,
                'expiring' => $expiringSoon++,
                'non_compliant' => $nonCompliant++,
                default => $unknown++,
            };

            $workers[] = [
                'id' => $member->id,
                'name' => $member->name,
                'badge_id' => null,
                'role' => $member->role,
                'avatar_url' => $member->avatar_url,
                'overall_status' => $status,
                'certifications' => $certs->map(fn ($c) => [
                    'id' => $c->id ?? null,
                    'name' => $c->name ?? 'Unknown',
                    'status' => $c->expires_at
                        ? (Carbon::parse($c->expires_at)->isPast()
                            ? 'expired'
                            : (Carbon::parse($c->expires_at)->diffInDays($now) <= 30 ? 'expiring_soon' : 'valid'))
                        : 'missing',
                    'issued_at' => $c->issued_at ?? null,
                    'expires_at' => $c->expires_at ?? null,
                ])->values()->toArray(),
            ];
        }

        $pct = $totalWorkers > 0 ? round(($compliant / $totalWorkers) * 100, 1) : 0;

        return response()->json(['data' => [
            'summary' => [
                'total_workers' => $totalWorkers,
                'compliant' => $compliant,
                'expiring_soon' => $expiringSoon,
                'non_compliant' => $nonCompliant,
                'compliance_pct' => $pct,
                'generated_at' => $now->toIso8601String(),
            ],
            'distribution' => $distribution,
            'workers' => $workers,
        ]]);
    }

    public function workers(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $request->user()->workspaces()->where('workspace_id', $workspace->id)->exists(),
            403
        );

        $members = DB::table('workspace_members')
            ->join('users', 'workspace_members.user_id', '=', 'users.id')
            ->where('workspace_members.workspace_id', $workspace->id)
            ->where('workspace_members.status', 'active')
            ->select(
                'users.id',
                'users.name',
                'users.avatar_url',
                'workspace_members.role',
                'workspace_members.job_title',
            )
            ->get();

        $now = now();
        $certData = DB::table('competency_records')
            ->whereIn('user_id', $members->pluck('id'))
            ->whereNotNull('expires_at')
            ->select('user_id', 'expires_at')
            ->get()
            ->groupBy('user_id');

        $workers = $members->map(function ($member) use ($certData, $now) {
            $certs = isset($certData[$member->id]) ? $certData[$member->id] : collect();
            $hasExpired = $certs->contains(fn ($c) => Carbon::parse($c->expires_at)->isPast());
            $hasExpiring = $certs->contains(function ($c) use ($now) {
                $exp = Carbon::parse($c->expires_at);
                return $exp->isFuture() && $exp->diffInDays($now) <= 30;
            });
            $hasValid = $certs->contains(fn ($c) => Carbon::parse($c->expires_at)->isFuture());

            $status = match (true) {
                $hasExpired => 'non_compliant',
                $hasExpiring => 'expiring',
                $hasValid => 'compliant',
                default => 'unknown',
            };

            return [
                'id' => $member->id,
                'name' => $member->name,
                'badge_id' => null,
                'role' => $member->role,
                'avatar_url' => $member->avatar_url,
                'overall_status' => $status,
                'certifications' => $certs->map(fn ($c) => [
                    'id' => $c->id ?? null,
                    'name' => $c->name ?? 'Unknown',
                    'status' => $c->expires_at
                        ? (Carbon::parse($c->expires_at)->isPast()
                            ? 'expired'
                            : (Carbon::parse($c->expires_at)->diffInDays($now) <= 30 ? 'expiring_soon' : 'valid'))
                        : 'missing',
                    'issued_at' => $c->issued_at ?? null,
                    'expires_at' => $c->expires_at ?? null,
                ])->values()->toArray(),
            ];
        });

        return response()->json(['data' => $workers]);
    }
}
