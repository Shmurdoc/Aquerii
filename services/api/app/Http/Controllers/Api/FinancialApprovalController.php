<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FinancialApprovalController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request, string $workspace): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $query = DB::table('invoice_approval_requests as ar')
            ->join('invoices as i', 'i.id', '=', 'ar.invoice_id')
            ->leftJoin('users as req', 'req.id', '=', 'ar.requested_by')
            ->leftJoin('users as app', 'app.id', '=', 'ar.approver_user_id')
            ->where('ar.workspace_id', $workspace)
            ->select([
                'ar.id',
                'ar.invoice_id',
                'ar.status',
                'ar.requested_at',
                'ar.resolved_at',
                'ar.decision_note',
                'i.invoice_number',
                'i.total',
                'i.currency',
                'i.status as invoice_status',
                'req.email as requested_by_email',
                'app.email as approver_email',
            ]);

        if ($request->filled('status')) {
            $query->where('ar.status', (string) $request->query('status'));
        }

        $rows = $query->orderByDesc('ar.created_at')->paginate(min(200, max(1, (int) $request->query('per_page', 50))));

        return response()->json([
            'data' => $rows->items(),
            'meta' => [
                'total' => $rows->total(),
                'per_page' => $rows->perPage(),
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
            ],
        ]);
    }

    public function submitInvoice(Request $request, string $workspace, string $invoiceId): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        $invoice = DB::table('invoices')
            ->where('workspace_id', $workspace)
            ->where('id', $invoiceId)
            ->first();

        abort_unless($invoice, 404, 'Invoice not found.');
        abort_if(in_array($invoice->status, ['approved', 'posted'], true), 422, 'Invoice is already approved/posted.');

        $openRequest = DB::table('invoice_approval_requests')
            ->where('workspace_id', $workspace)
            ->where('invoice_id', $invoiceId)
            ->where('status', 'pending')
            ->first();
        abort_if($openRequest, 409, 'Invoice already has a pending approval request.');

        $approvalId = (string) Str::uuid();

        DB::transaction(function () use ($workspace, $invoiceId, $user, $request, $approvalId) {
            DB::table('invoice_approval_requests')->insert([
                'id' => $approvalId,
                'workspace_id' => $workspace,
                'invoice_id' => $invoiceId,
                'status' => 'pending',
                'requested_by' => $user->id,
                'requested_at' => now(),
                'decision_note' => $request->input('note'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('invoices')
                ->where('workspace_id', $workspace)
                ->where('id', $invoiceId)
                ->update([
                    'status' => 'pending_approval',
                    'updated_at' => now(),
                ]);
        });

        $this->audit->log(
            action: 'invoice.approval_submitted',
            workspaceId: $workspace,
            userId: $user->id,
            resourceType: 'invoice',
            resourceId: $invoiceId,
            after: ['approval_request_id' => $approvalId]
        );

        return response()->json(['data' => ['approval_request_id' => $approvalId, 'status' => 'pending']], 201);
    }

    public function approveInvoice(Request $request, string $workspace, string $approvalId): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);
        $user = $request->user();

        $approval = DB::table('invoice_approval_requests')
            ->where('workspace_id', $workspace)
            ->where('id', $approvalId)
            ->first();

        abort_unless($approval, 404, 'Approval request not found.');
        abort_if($approval->status !== 'pending', 422, 'Approval request is not pending.');

        DB::transaction(function () use ($workspace, $approvalId, $approval, $user, $request) {
            DB::table('invoice_approval_requests')
                ->where('workspace_id', $workspace)
                ->where('id', $approvalId)
                ->update([
                    'status' => 'approved',
                    'approver_user_id' => $user?->id,
                    'decision_note' => $request->input('note'),
                    'resolved_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('invoices')
                ->where('workspace_id', $workspace)
                ->where('id', $approval->invoice_id)
                ->update([
                    'status' => 'approved',
                    'updated_at' => now(),
                ]);
        });

        $this->audit->log(
            action: 'invoice.approval_approved',
            workspaceId: $workspace,
            userId: $user?->id,
            resourceType: 'invoice_approval',
            resourceId: $approvalId,
            after: ['invoice_id' => $approval->invoice_id]
        );

        return response()->json(['data' => ['approved' => true]]);
    }

    public function rejectInvoice(Request $request, string $workspace, string $approvalId): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);
        $user = $request->user();

        $approval = DB::table('invoice_approval_requests')
            ->where('workspace_id', $workspace)
            ->where('id', $approvalId)
            ->first();

        abort_unless($approval, 404, 'Approval request not found.');
        abort_if($approval->status !== 'pending', 422, 'Approval request is not pending.');

        DB::transaction(function () use ($workspace, $approvalId, $approval, $user, $request) {
            DB::table('invoice_approval_requests')
                ->where('workspace_id', $workspace)
                ->where('id', $approvalId)
                ->update([
                    'status' => 'rejected',
                    'approver_user_id' => $user?->id,
                    'decision_note' => $request->input('note'),
                    'resolved_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('invoices')
                ->where('workspace_id', $workspace)
                ->where('id', $approval->invoice_id)
                ->update([
                    'status' => 'draft',
                    'updated_at' => now(),
                ]);
        });

        $this->audit->log(
            action: 'invoice.approval_rejected',
            workspaceId: $workspace,
            userId: $user?->id,
            resourceType: 'invoice_approval',
            resourceId: $approvalId,
            after: ['invoice_id' => $approval->invoice_id]
        );

        return response()->json(['data' => ['rejected' => true]]);
    }

    public function reversePostedInvoice(Request $request, string $workspace, string $invoiceId): JsonResponse
    {
        $this->requireWorkspaceAdmin($request, $workspace);

        $data = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $invoice = DB::table('invoices')
            ->where('workspace_id', $workspace)
            ->where('id', $invoiceId)
            ->first();

        abort_unless($invoice, 404, 'Invoice not found.');
        abort_if($invoice->status !== 'posted', 422, 'Only posted invoices can be reversed.');

        DB::table('invoices')
            ->where('workspace_id', $workspace)
            ->where('id', $invoiceId)
            ->update([
                'status' => 'reversed',
                'reversed_at' => now(),
                'reversal_reason' => $data['reason'],
                'updated_at' => now(),
            ]);

        $this->audit->log(
            action: 'invoice.posting_reversed',
            workspaceId: $workspace,
            userId: $request->user()?->id,
            resourceType: 'invoice',
            resourceId: $invoiceId,
            before: ['status' => $invoice->status],
            after: ['status' => 'reversed', 'reason' => $data['reason']]
        );

        return response()->json(['data' => ['reversed' => true]]);
    }

    private function requireWorkspaceAdmin(Request $request, string $workspaceId): void
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first(['role']);

        abort_if(! $member || ! in_array($member->role, ['owner', 'admin'], true), 403, 'Insufficient role for this action.');
    }
}
