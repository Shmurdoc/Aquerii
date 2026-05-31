<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Services\AuditService;
use App\Core\Services\SalesOrderWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class InvoiceWorkflowController extends Controller
{
    public function __construct(
        private SalesOrderWorkflowService $workflow,
        private AuditService $audit
    ) {}

    /**
     * POST /workspaces/{workspace}/sales/orders/{so}/convert-to-invoice
     */
    public function convertToInvoice(Request $request, string $workspaceId, string $soId): JsonResponse
    {
        $invoice = $this->workflow->convertToInvoice($workspaceId, $soId);

        $this->safeAudit('invoice.converted_from_sales_order', $workspaceId, $request->user()?->id, 'invoice', (string) ($invoice->id ?? ''), [], [
            'sales_order_id' => $soId,
        ]);

        return response()->json(['invoice' => $invoice], 201);
    }

    /**
     * POST /workspaces/{workspace}/invoices/{invoice}/payments
     */
    public function recordPayment(Request $request, string $workspaceId, string $invoiceId): JsonResponse
    {
        $invoiceState = DB::table('invoices')
            ->where('workspace_id', $workspaceId)
            ->where('id', $invoiceId)
            ->select('status')
            ->first();

        abort_unless($invoiceState, 404, 'Invoice not found.');
        abort_if($invoiceState->status === 'posted', 422, 'Posted invoices are immutable. Use reversal workflow.');

        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'nullable|string|max:50',
            'reference' => 'nullable|string|max:200',
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $data['recorded_by'] = $request->user()?->id;

        $invoice = $this->workflow->recordPayment($workspaceId, $invoiceId, $data);

        $this->safeAudit('invoice.payment_recorded', $workspaceId, $request->user()?->id, 'invoice', $invoiceId, [], [
            'amount' => $data['amount'],
            'method' => $data['method'] ?? null,
            'reference' => $data['reference'] ?? null,
        ]);

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
            'status' => 'required|in:draft,pending_approval,approved,posted,reversed,sent,partial,paid,overdue,cancelled',
        ]);

        $before = DB::table('invoices')
            ->where('id', $invoiceId)
            ->where('workspace_id', $workspaceId)
            ->select('id', 'status', 'sent_at', 'posted_at')
            ->first();

        abort_unless($before, 404, 'Invoice not found.');
        abort_if(! $this->canTransition((string) $before->status, (string) $data['status']), 422, 'Invalid invoice status transition.');

        $updated = DB::table('invoices')
            ->where('id', $invoiceId)
            ->where('workspace_id', $workspaceId)
            ->update([
                'status' => $data['status'],
                'sent_at' => $data['status'] === 'sent' ? now() : DB::raw('sent_at'),
                'posted_at' => $data['status'] === 'posted' ? now() : DB::raw('posted_at'),
                'updated_at' => now(),
            ]);

        abort_unless($updated, 404, 'Invoice not found.');

        $this->safeAudit('invoice.status_updated', $workspaceId, $request->user()?->id, 'invoice', $invoiceId, [
            'status' => $before->status ?? null,
            'sent_at' => $before->sent_at ?? null,
        ], [
            'status' => $data['status'],
        ]);

        return response()->json(['success' => true]);
    }

    private function canTransition(string $from, string $to): bool
    {
        if ($from === 'posted') {
            return $to === 'reversed';
        }

        $allowed = [
            'draft' => ['pending_approval', 'sent', 'cancelled'],
            'pending_approval' => ['approved', 'draft', 'cancelled'],
            'approved' => ['posted', 'cancelled'],
            'sent' => ['partial', 'paid', 'overdue', 'cancelled'],
            'partial' => ['paid', 'overdue', 'cancelled'],
            'overdue' => ['partial', 'paid', 'cancelled'],
            'paid' => [],
            'cancelled' => [],
            'reversed' => [],
        ];

        return in_array($to, $allowed[$from] ?? [], true);
    }

    private function safeAudit(
        string $action,
        ?string $workspaceId,
        ?string $userId,
        ?string $resourceType,
        ?string $resourceId,
        array $before,
        array $after
    ): void {
        try {
            $this->audit->log(
                action: $action,
                workspaceId: $workspaceId,
                userId: $userId,
                resourceType: $resourceType,
                resourceId: $resourceId,
                before: $before,
                after: $after,
            );
        } catch (Throwable) {
            // Financial workflow must continue if audit persistence fails.
        }
    }
}
