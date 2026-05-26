<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * GET /workspaces/{workspace}/reports/dashboard
     * Returns all dashboard widget data in one request.
     */
    public function dashboard(Request $request, string $workspaceId)
    {
        $period = $request->query('period', '30'); // days
        $since  = now()->subDays((int)$period)->startOfDay();

        // Revenue this period vs last period
        $revenueThisPeriod = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->where('status', 'paid')
            ->where('paid_at', '>=', $since)
            ->whereNull('deleted_at')
            ->sum('total');

        $revenuePrevPeriod = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->where('status', 'paid')
            ->where('paid_at', '>=', now()->subDays((int)$period * 2)->startOfDay())
            ->where('paid_at', '<', $since)
            ->whereNull('deleted_at')
            ->sum('total');

        // Outstanding receivables (sent/partial invoices: total minus amount already paid)
        $outstanding = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->whereIn('status', ['sent', 'partial'])
            ->whereNull('deleted_at')
            ->sum(DB::raw('total - amount_paid'));

        // Overdue invoices
        $overdue = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->whereIn('status', ['sent', 'partial'])
            ->where('due_date', '<', now()->toDateString())
            ->whereNull('deleted_at')
            ->count();

        // Revenue by day for sparkline (last 30 days always)
        $revenueByDay = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->where('status', 'paid')
            ->where('paid_at', '>=', now()->subDays(30)->startOfDay())
            ->whereNull('deleted_at')
            ->select(DB::raw("DATE(paid_at) as day, SUM(total) as revenue"))
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        // Invoice status breakdown (pie)
        $invoiceStatusBreakdown = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->select('status', DB::raw('count(*) as count, sum(total) as total'))
            ->groupBy('status')
            ->get();

        // Top 5 customers by revenue
        $topCustomers = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->where('status', 'paid')
            ->whereNull('deleted_at')
            ->whereNotNull('customer_name')
            ->select('customer_name', DB::raw('sum(total) as revenue, count(*) as invoice_count'))
            ->groupBy('customer_name')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        // Open board items (not done/completed/archived)
        $openItems = DB::table('items')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->whereNotIn('status', ['done', 'completed', 'archived'])
            ->count();

        // AR aging buckets
        $aging = $this->arAging($workspaceId);

        return response()->json([
            'revenue_this_period'      => (float)$revenueThisPeriod,
            'revenue_prev_period'      => (float)$revenuePrevPeriod,
            'revenue_change_pct'       => $revenuePrevPeriod > 0
                ? round((($revenueThisPeriod - $revenuePrevPeriod) / $revenuePrevPeriod) * 100, 1)
                : null,
            'outstanding'              => (float)$outstanding,
            'overdue_count'            => (int)$overdue,
            'open_items'               => (int)$openItems,
            'revenue_by_day'           => $revenueByDay,
            'invoice_status_breakdown' => $invoiceStatusBreakdown,
            'top_customers'            => $topCustomers,
            'ar_aging'                 => $aging,
        ]);
    }

    private function arAging(string $workspaceId): array
    {
        $today = now()->toDateString();

        $buckets = [
            'current' => [0, 30],
            '31_60'   => [31, 60],
            '61_90'   => [61, 90],
            'over_90' => [91, 99999],
        ];

        $result = [];
        foreach ($buckets as $key => [$minDays, $maxDays]) {
            $amount = DB::table('invoices')
                ->where('workspace_id', $workspaceId)
                ->whereIn('status', ['sent', 'partial'])
                ->whereNull('deleted_at')
                ->whereRaw("? ::date - due_date BETWEEN ? AND ?", [$today, $minDays, $maxDays])
                ->sum(DB::raw('total - amount_paid'));

            $result[$key] = (float)$amount;
        }

        return $result;
    }

    /**
     * GET /workspaces/{workspace}/reports/invoices
     * Detailed invoice report with date range filtering.
     */
    public function invoices(Request $request, string $workspaceId)
    {
        $from   = $request->query('from', now()->startOfMonth()->toDateString());
        $to     = $request->query('to', now()->toDateString());
        $status = $request->query('status');

        $query = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59']);

        if ($status) {
            $query->where('status', $status);
        }

        $invoices = $query
            ->select('id', 'invoice_number', 'customer_name', 'status', 'total', 'amount_paid', 'due_date', 'created_at', 'paid_at')
            ->orderByDesc('created_at')
            ->paginate(50);

        $summaryQuery = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59']);

        if ($status) {
            $summaryQuery->where('status', $status);
        }

        $summary = $summaryQuery
            ->select(
                DB::raw('count(*) as total_count'),
                DB::raw('sum(total) as total_value'),
                DB::raw('sum(amount_paid) as total_paid'),
                DB::raw('sum(total - amount_paid) as total_outstanding')
            )
            ->first();

        return response()->json(['invoices' => $invoices, 'summary' => $summary]);
    }

    /**
     * GET /workspaces/{workspace}/reports/expenses
     */
    public function expenses(Request $request, string $workspaceId)
    {
        $from     = $request->query('from', now()->startOfMonth()->toDateString());
        $to       = $request->query('to', now()->toDateString());
        $category = $request->query('category');
        $status   = $request->query('status');

        $baseQuery = DB::table('expense_claims')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59']);

        if ($category) $baseQuery->where('category', $category);
        if ($status)   $baseQuery->where('status', $status);

        $expenses = (clone $baseQuery)
            ->select('id', 'title', 'category', 'amount', 'currency', 'status', 'expense_date', 'created_at')
            ->orderByDesc('created_at')
            ->paginate(50);

        $summary = (clone $baseQuery)
            ->select(
                DB::raw('count(*) as total_count'),
                DB::raw('sum(amount) as total_amount'),
                DB::raw("sum(case when status = 'pending' then amount else 0 end) as pending"),
                DB::raw("sum(case when status = 'approved' then amount else 0 end) as approved")
            )
            ->first();

        $byCategory = (clone $baseQuery)
            ->select('category', DB::raw('count(*) as count'), DB::raw('sum(amount) as amount'))
            ->groupBy('category')
            ->orderBy('category')
            ->get();

        $byMonth = (clone $baseQuery)
            ->select(DB::raw("to_char(expense_date, 'YYYY-MM') as month"), DB::raw('sum(amount) as amount'))
            ->groupBy(DB::raw("to_char(expense_date, 'YYYY-MM')"))
            ->orderBy('month')
            ->get();

        return response()->json([
            'summary'     => $summary,
            'by_category' => $byCategory,
            'by_month'    => $byMonth,
            'expenses'    => $expenses,
        ]);
    }

    /**
     * GET /workspaces/{workspace}/reports/procurement
     */
    public function procurement(Request $request, string $workspaceId)
    {
        $from = $request->query('from', now()->startOfMonth()->toDateString());
        $to   = $request->query('to', now()->toDateString());

        $baseQuery = DB::table('purchase_orders')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59']);

        $orders = (clone $baseQuery)
            ->select('id', 'order_number', 'supplier_name', 'status', 'total', 'currency', 'order_date', 'expected_date')
            ->orderByDesc('created_at')
            ->paginate(50);

        $summary = (clone $baseQuery)
            ->select(
                DB::raw('count(*) as total_orders'),
                DB::raw('sum(total) as total_value'),
                DB::raw("sum(case when status = 'draft' or status = 'sent' then total else 0 end) as pending"),
                DB::raw("sum(case when status = 'received' then total else 0 end) as received")
            )
            ->first();

        $bySupplier = (clone $baseQuery)
            ->select('supplier_name', DB::raw('count(*) as count'), DB::raw('sum(total) as total'))
            ->groupBy('supplier_name')
            ->orderByDesc('total')
            ->get();

        $byMonth = (clone $baseQuery)
            ->select(DB::raw("to_char(order_date, 'YYYY-MM') as month"), DB::raw('count(*) as orders'), DB::raw('sum(total) as amount'))
            ->groupBy(DB::raw("to_char(order_date, 'YYYY-MM')"))
            ->orderBy('month')
            ->get();

        return response()->json([
            'summary'     => $summary,
            'by_supplier' => $bySupplier,
            'by_month'    => $byMonth,
            'orders'      => $orders,
        ]);
    }

    /**
     * GET /workspaces/{workspace}/reports/inventory
     */
    public function inventory(Request $request, string $workspaceId)
    {
        $totalProducts = DB::table('products')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->count();

        $totalStock = DB::table('stock_items')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->sum('quantity');

        $lowStock = DB::table('stock_items')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->where('quantity', '<', 10)
            ->count();

        $categories = DB::table('inventory_categories')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->count();

        $byCategory = DB::table('products')
            ->leftJoin('inventory_categories', 'products.category_id', '=', 'inventory_categories.id')
            ->where('products.workspace_id', $workspaceId)
            ->whereNull('products.deleted_at')
            ->select('inventory_categories.name as category', DB::raw('count(*) as count'))
            ->groupBy('inventory_categories.name')
            ->get();

        $recentProducts = DB::table('products')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->select('id', 'name', 'sku', 'unit_price', 'currency')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'total_products' => (int)$totalProducts,
            'total_stock'    => (int)$totalStock,
            'low_stock_items' => (int)$lowStock,
            'categories'     => (int)$categories,
            'by_category'    => $byCategory,
            'recent_products' => $recentProducts,
        ]);
    }

    /**
     * GET /workspaces/{workspace}/reports/export/{type}
     */
    public function export(Request $request, string $workspaceId, string $type)
    {
        $from   = $request->query('from', now()->startOfMonth()->toDateString());
        $to     = $request->query('to', now()->toDateString());
        $format = $request->query('format', 'csv');

        $rows = match ($type) {
            'invoices' => DB::table('invoices')
                ->where('workspace_id', $workspaceId)
                ->whereNull('deleted_at')
                ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
                ->select('invoice_number', 'customer_name', 'status', 'total', 'amount_paid', 'due_date', 'paid_at')
                ->get()
                ->toArray(),
            'expenses' => DB::table('expense_claims')
                ->where('workspace_id', $workspaceId)
                ->whereNull('deleted_at')
                ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
                ->select('title', 'category', 'amount', 'currency', 'status', 'expense_date')
                ->get()
                ->toArray(),
            'procurement' => DB::table('purchase_orders')
                ->where('workspace_id', $workspaceId)
                ->whereNull('deleted_at')
                ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
                ->select('order_number', 'supplier_name', 'status', 'total', 'order_date', 'expected_date')
                ->get()
                ->toArray(),
            'aging' => $this->arAgingDetailed($workspaceId),
            default => abort(404, 'Unknown report type'),
        };

        $filename = "{$type}-{$from}-{$to}.csv";

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($rows) {
            $handle = fopen('php://output', 'w');
            if (!empty($rows)) {
                fputcsv($handle, array_keys((array)$rows[0]));
            }
            foreach ($rows as $row) {
                fputcsv($handle, (array)$row);
            }
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function arAgingDetailed(string $workspaceId): array
    {
        $today = now()->toDateString();

        $invoices = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->whereIn('status', ['sent', 'partial'])
            ->whereNull('deleted_at')
            ->where('due_date', '<', $today)
            ->select('id', 'invoice_number', 'customer_name', 'status', 'total', 'amount_paid', 'due_date')
            ->orderBy('due_date')
            ->get();

        $result = [];
        foreach ($invoices as $inv) {
            $daysOverdue = (int) now()->diffInDays($inv->due_date);
            $bucket = match (true) {
                $daysOverdue <= 30 => '1-30 days',
                $daysOverdue <= 60 => '31-60 days',
                $daysOverdue <= 90 => '61-90 days',
                default            => 'Over 90 days',
            };
            $result[] = [
                'id'             => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'customer_name'  => $inv->customer_name,
                'status'         => $inv->status,
                'total'          => (float)$inv->total,
                'amount_paid'    => (float)$inv->amount_paid,
                'outstanding'    => (float)$inv->total - (float)$inv->amount_paid,
                'due_date'       => $inv->due_date,
                'days_overdue'   => $daysOverdue,
                'aging_bucket'   => $bucket,
            ];
        }

        return $result;
    }
}
