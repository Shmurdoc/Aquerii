<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EntitySearchController extends Controller
{
    /**
     * GET /workspaces/{workspace}/entities/search?q=acme&type=customer
     *
     * Returns matching crm_companies as entity stubs for linking to documents.
     */
    public function search(Request $request, string $workspaceId): JsonResponse
    {
        $q = $request->query('q', '');
        $type = $request->query('type'); // customer|supplier|both|prospect|null (all)

        $query = DB::table('crm_companies')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->select(
                'id', 'name', 'entity_type',
                'email', 'phone',
                'total_revenue', 'total_spend', 'last_activity_at'
            );

        if (strlen((string) $q) >= 1) {
            $query->where('name', 'ilike', '%'.$q.'%');
        }

        if ($type) {
            $query->where(function ($sub) use ($type) {
                $sub->where('entity_type', $type)
                    ->orWhere('entity_type', 'both');
            });
        }

        $results = $query->orderByDesc('last_activity_at')->limit(20)->get();

        return response()->json(['entities' => $results]);
    }

    /**
     * GET /workspaces/{workspace}/entities/{company}/360
     *
     * Returns the "Entity 360" view: company + contacts + linked invoices/SOs/POs.
     */
    public function entity360(Request $request, string $workspaceId, string $companyId): JsonResponse
    {
        $company = DB::table('crm_companies')
            ->where('id', $companyId)
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->first();

        abort_unless($company !== null, 404, 'Company not found.');

        $contacts = DB::table('crm_contacts')
            ->where('company_id', $companyId)
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get();

        // Invoices: match by FK (customer_company_id) or by name fallback
        $invoices = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->where(function ($q) use ($companyId, $company) {
                $q->where('customer_company_id', $companyId)
                    ->orWhere('customer_name', $company->name);
            })
            ->whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        // Sales orders: match by FK
        $salesOrders = DB::table('sales_orders')
            ->where('workspace_id', $workspaceId)
            ->where('customer_company_id', $companyId)
            ->whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        // Purchase orders: match by supplier FK (supplier_company_id)
        $purchaseOrders = DB::table('purchase_orders')
            ->where('workspace_id', $workspaceId)
            ->where('supplier_company_id', $companyId)
            ->whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'company' => $company,
            'contacts' => $contacts,
            'invoices' => $invoices,
            'sales_orders' => $salesOrders,
            'purchase_orders' => $purchaseOrders,
        ]);
    }
}
