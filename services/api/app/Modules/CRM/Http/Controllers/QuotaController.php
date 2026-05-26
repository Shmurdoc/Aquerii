<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Models\CrmQuota;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuotaController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $query = CrmQuota::where('workspace_id', $workspace->id)->with('user');

        if ($periodType = $request->query('period_type')) {
            $query->where('period_type', $periodType);
        }
        if ($year = $request->query('year')) {
            $query->where('year', $year);
        }
        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('create', [CrmQuota::class, $workspace]);

        $validated = $request->validate([
            'user_id' => 'required|uuid',
            'quota_amount' => 'required|numeric|min:0',
            'currency' => 'sometimes|string|size:3',
            'period_type' => 'required|in:monthly,quarterly,yearly',
            'year' => 'required|integer|min:2020|max:2099',
            'month' => 'sometimes|nullable|integer|between:1,12',
            'quarter' => 'sometimes|nullable|integer|between:1,4',
        ]);

        $quota = CrmQuota::create(array_merge($validated, [
            'workspace_id' => $workspace->id,
            'currency' => $validated['currency'] ?? 'USD',
        ]));

        return response()->json(['data' => $quota->load('user')], 201);
    }

    public function show(Workspace $workspace, CrmQuota $quota): JsonResponse
    {
        abort_if($quota->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $quota->load('user')]);
    }

    public function update(Request $request, Workspace $workspace, CrmQuota $quota): JsonResponse
    {
        abort_if($quota->workspace_id !== $workspace->id, 404);
        $this->authorize('update', $quota);

        $validated = $request->validate([
            'quota_amount' => 'sometimes|numeric|min:0',
            'currency' => 'sometimes|string|size:3',
            'period_type' => 'sometimes|in:monthly,quarterly,yearly',
            'year' => 'sometimes|integer|min:2020|max:2099',
            'month' => 'sometimes|nullable|integer|between:1,12',
            'quarter' => 'sometimes|nullable|integer|between:1,4',
        ]);

        $quota->update($validated);

        return response()->json(['data' => $quota->load('user')]);
    }

    public function destroy(Workspace $workspace, CrmQuota $quota): JsonResponse
    {
        abort_if($quota->workspace_id !== $workspace->id, 404);
        $this->authorize('delete', $quota);

        $quota->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function attainment(Request $request, Workspace $workspace, CrmQuota $quota): JsonResponse
    {
        abort_if($quota->workspace_id !== $workspace->id, 404);

        $query = CrmDeal::where('workspace_id', $workspace->id)
            ->where('owner_id', $quota->user_id)
            ->whereNotNull('won_at');

        if ($quota->period_type === 'monthly' && $quota->month) {
            $query->whereYear('won_at', $quota->year)
                ->whereMonth('won_at', $quota->month);
        } elseif ($quota->period_type === 'quarterly' && $quota->quarter) {
            $startMonth = ($quota->quarter - 1) * 3 + 1;
            $query->whereYear('won_at', $quota->year)
                ->whereMonth('won_at', '>=', $startMonth)
                ->whereMonth('won_at', '<=', $startMonth + 2);
        } elseif ($quota->period_type === 'yearly') {
            $query->whereYear('won_at', $quota->year);
        }

        $wonValue = $query->sum('value');
        $attainment = $quota->quota_amount > 0
            ? round(($wonValue / $quota->quota_amount) * 100, 2)
            : 0;

        return response()->json([
            'data' => [
                'quota_amount' => $quota->quota_amount,
                'won_value' => round($wonValue, 2),
                'attainment_percent' => $attainment,
            ],
        ]);
    }
}
