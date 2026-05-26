<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Services\SalesOrderWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceWorkflowController extends Controller
{
    public function __construct(private SalesOrderWorkflowService $workflow) {}

    /**
     * POST /workspaces/{workspace}/sales/orders/{so}/convert-to-invoice
     */
    public function convertToInvoice(Request $request, string $workspaceId, string $soId): JsonResponse
    {
        $invoice = $this->workflow->convertToInvoice($workspaceId, $soId);
        return response()->json(['invoice' => $invoice], 201);
    }

    /**
     * POST /workspaces/{workspace}/invoices/{invoice}/payments
     */
    public function recordPayment(Request $request, string $workspaceId, string $invoiceId): JsonResponse
    {
        $data = $request->validate([
            'amount'       => 'required|numeric|min:0.01',
            'method'       => 'nullable|string|max:50',
            'reference'    => 'nullable|string|max:200',
            'payment_date' => 'nullable|date',
            'notes'        => 'nullable|string',
        ]);

        $data['recorded_by'] = $request->user()?->id;

        $invoice = $this->workflow->recordPayment($workspaceId, $invoiceId, $data);
        return response()->json(['invoice' => $invoice]);
    }

    /**
     * GET /workspaces/{workspace}/invoices/{invoice}/payments
     */
    public function listPayments(Request $request, string $workspaceId, string $invoiceId): JsonResponse
    {
        $payments = DB::table('invoice_payments')
            ->where('workspace_id', $workspaceId)
            ->where('invoice_id', $invoiceId)
            ->orderByDesc('payment_date')
            ->get();

        return response()->json(['payments' => $payments]);
    }

    /**
     * PATCH /workspaces/{workspace}/invoices/{invoice}/status
     */
    public function updateStatus(Request $request, string $workspaceId, string $invoiceId): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:draft,sent,partial,paid,overdue,cancelled',
        ]);

        $updated = DB::table('invoices')
            ->where('id', $invoiceId)
            ->where('workspace_id', $workspaceId)
            ->update([
                'status'     => $data['status'],
                'sent_at'    => $data['status'] === 'sent' ? now() : DB::raw('sent_at'),
                'updated_at' => now(),
            ]);

        abort_unless($updated, 404, 'Invoice not found.');

        return response()->json(['success' => true]);
    }
}
