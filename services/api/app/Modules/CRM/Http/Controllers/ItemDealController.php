<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Item;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmDeal;
use Illuminate\Http\JsonResponse;

class ItemDealController extends Controller
{
    public function index(Workspace $workspace, Item $item): JsonResponse
    {
        abort_if($item->workspace_id !== $workspace->id, 404);

        $deals = CrmDeal::where('linked_item_id', $item->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $deals]);
    }
}
