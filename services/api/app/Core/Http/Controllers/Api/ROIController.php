<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Services\ROIDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ROIController extends Controller
{
    public function __construct(
        private readonly ROIDashboardService $roiDashboardService
    ) {}

    public function dashboard(Request $request, string $workspaceId): JsonResponse
    {
        $data = $this->roiDashboardService->getDashboard(
            $workspaceId,
            $request->query('from'),
            $request->query('to')
        );

        return response()->json(['data' => $data]);
    }
}
