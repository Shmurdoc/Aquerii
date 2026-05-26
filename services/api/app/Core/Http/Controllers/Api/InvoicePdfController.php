<?php
namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;

use App\Core\Services\PdfService;
use App\Modules\Invoicing\Models\Invoice;
use App\Core\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InvoicePdfController extends Controller
{
    public function __construct(private PdfService $pdf) {}

    public function show(Request $request, Workspace $workspace, Invoice $invoice): Response
    {
        abort_if($invoice->workspace_id !== $workspace->id, 404);

        $invoice->load('items');
        $items = $invoice->items;

        // Resolve template from workspace settings
        $settings  = $workspace->settings ?? [];
        $template  = $settings['doc_template'] ?? 'modern';
        $template  = in_array($template, ['modern', 'classic', 'minimal']) ? $template : 'modern';

        // Build a customer object from inline invoice fields (invoices store
        // customer data denormalised; no FK to crm_companies is guaranteed)
        $customer = (object) [
            'name'    => $invoice->customer_name,
            'email'   => $invoice->customer_email,
            'phone'   => null,
            'address' => $invoice->billing_address,
        ];

        $pdfContent = $this->pdf->renderBladeAsPdf("pdfs.invoice.{$template}", compact(
            'invoice', 'items', 'workspace', 'customer'
        ));

        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="invoice-' . $invoice->invoice_number . '.pdf"',
        ]);
    }
}
