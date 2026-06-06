<?php

namespace App\Core\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SalesOrderWorkflowService
{
    /**
     * Convert a confirmed (or any non-cancelled) sales order to a draft invoice.
     * Copies all line items. Sets source_sales_order_id on the new invoice.
     * Marks the SO as converted (status → fulfilled).
     */
    public function convertToInvoice(string $workspaceId, string $salesOrderId): object
    {
        return DB::transaction(function () use ($workspaceId, $salesOrderId) {
            $so = DB::table('sales_orders')
                ->where('id', $salesOrderId)
                ->where('workspace_id', $workspaceId)
                ->lockForUpdate()
                ->first();

            abort_unless($so, 404, 'Sales order not found.');
            abort_if(
                $so->status === 'cancelled',
                422,
                'Cannot convert a cancelled sales order.'
            );
            abort_if(
                $so->converted_to_invoice_id,
                409,
                'Sales order has already been converted to an invoice.'
            );

            // Derive the next invoice number using the same pattern as InvoiceController
            // (workspace-scoped sequence: INV-YYYY-NNNN)
            $year = now()->format('Y');
            $lastNumber = DB::table('invoices')
                ->where('workspace_id', $workspaceId)
                ->where('invoice_number', 'like', "INV-{$year}-%")
                ->orderByDesc('invoice_number')
                ->value('invoice_number');

            $seq = 1;
            if ($lastNumber) {
                $parts = explode('-', $lastNumber);
                $seq = ((int) end($parts)) + 1;
            }
            $invoiceNumber = sprintf('INV-%s-%04d', $year, $seq);

            $invoiceId = Str::uuid()->toString();

            DB::table('invoices')->insert([
                'id' => $invoiceId,
                'workspace_id' => $workspaceId,
                'invoice_number' => $invoiceNumber,
                'status' => 'draft',
                'source_sales_order_id' => $salesOrderId,
                'customer_id' => $so->customer_id ?? null,
                'customer_name' => $so->customer_name ?? '',
                'customer_email' => $so->customer_email ?? null,
                'currency' => $so->currency ?? 'ZAR',
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays(30)->toDateString(),
                'subtotal' => $so->subtotal ?? 0,
                'tax_total' => $so->tax_total ?? 0,
                'total' => $so->total ?? 0,
                'amount_paid' => 0,
                'notes' => $so->notes ?? null,
                'created_by' => $so->created_by,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Copy line items from sales_order_items → invoice_items
            $items = DB::table('sales_order_items')
                ->where('sales_order_id', $salesOrderId)
                ->get();

            foreach ($items as $item) {
                DB::table('invoice_items')->insert([
                    'id' => Str::uuid()->toString(),
                    'invoice_id' => $invoiceId,
                    'description' => $item->description ?? '',
                    'quantity' => $item->quantity ?? 1,
                    'unit_price' => $item->unit_price ?? 0,
                    'tax_rate' => $item->tax_rate ?? 0,
                    'total' => $item->total ?? 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Mark the SO as converted
            DB::table('sales_orders')
                ->where('id', $salesOrderId)
                ->update([
                    'converted_to_invoice_id' => $invoiceId,
                    'converted_at' => now(),
                    'status' => 'fulfilled',
                    'updated_at' => now(),
                ]);

            return DB::table('invoices')->where('id', $invoiceId)->first();
        });
    }

    /**
     * Record a payment against an invoice.
     * Updates amount_paid and transitions status to partial or paid.
     */
    public function recordPayment(string $workspaceId, string $invoiceId, array $data): object
    {
        return DB::transaction(function () use ($workspaceId, $invoiceId, $data) {
            $invoice = DB::table('invoices')
                ->where('id', $invoiceId)
                ->where('workspace_id', $workspaceId)
                ->lockForUpdate()
                ->first();

            abort_unless($invoice, 404, 'Invoice not found.');
            abort_if($invoice->status === 'cancelled', 422, 'Cannot record payment on a cancelled invoice.');

            $paymentId = Str::uuid()->toString();
            DB::table('invoice_payments')->insert([
                'id' => $paymentId,
                'workspace_id' => $workspaceId,
                'invoice_id' => $invoiceId,
                'amount' => $data['amount'],
                'method' => $data['method'] ?? null,
                'reference' => $data['reference'] ?? null,
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'notes' => $data['notes'] ?? null,
                'recorded_by' => $data['recorded_by'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $newPaid = bcadd((string) ($invoice->amount_paid ?? 0), (string) $data['amount'], 2);
            $newStatus = bccomp($newPaid, (string) $invoice->total, 2) >= 0 ? 'paid' : 'partial';

            DB::table('invoices')->where('id', $invoiceId)->update([
                'amount_paid' => $newPaid,
                'status' => $newStatus,
                'paid_at' => $newStatus === 'paid' ? now() : null,
                'updated_at' => now(),
            ]);

            return DB::table('invoices')->where('id', $invoiceId)->first();
        });
    }
}
