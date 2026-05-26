<?php
namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;

use App\Core\Services\PdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentPdfController extends Controller
{
    private array $typeConfig = [
        'quotes'          => ['entity_type' => 'customer'],
        'sales-orders'    => ['entity_type' => 'customer'],
        'purchase-orders' => ['entity_type' => 'supplier'],
        'goods-receipts'  => ['entity_type' => 'supplier'],
        'receipts'        => ['entity_type' => 'customer'],
        'credit-notes'    => ['entity_type' => 'customer'],
    ];

    private array $typeToTable = [
        'quotes'          => 'quotes',
        'sales-orders'    => 'sales_orders',
        'purchase-orders' => 'purchase_orders',
        'goods-receipts'  => 'goods_receipt_notes',
        'receipts'        => 'receipts',
        'credit-notes'    => 'credit_notes',
    ];

    private array $typeToItemsTable = [
        'quotes'          => 'quote_items',
        'sales-orders'    => 'sales_order_items',
        'purchase-orders' => 'purchase_order_items',
        'goods-receipts'  => 'grn_items',
        'receipts'        => 'receipt_items',
        'credit-notes'    => 'credit_note_items',
    ];

    private array $typeToFkCol = [
        'quotes'          => 'quote_id',
        'sales-orders'    => 'sales_order_id',
        'purchase-orders' => 'purchase_order_id',
        'goods-receipts'  => 'goods_receipt_note_id',
        'receipts'        => 'receipt_id',
        'credit-notes'    => 'credit_note_id',
    ];

    private array $typeToViewFolder = [
        'quotes'          => 'quote',
        'sales-orders'    => 'sales_order',
        'purchase-orders' => 'purchase_order',
        'goods-receipts'  => 'goods_receipt',
        'receipts'        => 'receipt',
        'credit-notes'    => 'credit_note',
    ];

    public function __construct(private PdfService $pdf) {}

    public function quote(Request $r, string $wid, string $id)
    {
        return $this->generate('quotes', $wid, $id);
    }

    public function salesOrder(Request $r, string $wid, string $id)
    {
        return $this->generate('sales-orders', $wid, $id);
    }

    public function purchaseOrder(Request $r, string $wid, string $id)
    {
        return $this->generate('purchase-orders', $wid, $id);
    }

    public function goodsReceipt(Request $r, string $wid, string $id)
    {
        return $this->generate('goods-receipts', $wid, $id);
    }

    public function receipt(Request $r, string $wid, string $id)
    {
        return $this->generate('receipts', $wid, $id);
    }

    public function creditNote(Request $r, string $wid, string $id)
    {
        return $this->generate('credit-notes', $wid, $id);
    }

    private function generate(string $type, string $workspaceId, string $documentId): \Illuminate\Http\Response
    {
        $config      = $this->typeConfig[$type];
        $table       = $this->typeToTable[$type];
        $itemsTable  = $this->typeToItemsTable[$type];
        $fkCol       = $this->typeToFkCol[$type];
        $viewFolder  = $this->typeToViewFolder[$type];

        $document = DB::table($table)
            ->where('workspace_id', $workspaceId)
            ->where('id', $documentId)
            ->firstOrFail();

        $items = DB::table($itemsTable)
            ->where($fkCol, $documentId)
            ->get();

        $workspace = DB::table('workspaces')->where('id', $workspaceId)->first();
        $settings  = is_string($workspace->settings ?? null)
            ? json_decode($workspace->settings, true)
            : (array) ($workspace->settings ?? []);
        $workspace->settings = $settings;

        $template = $settings['doc_template'] ?? 'modern';
        $template = in_array($template, ['modern', 'classic', 'minimal']) ? $template : 'modern';

        $entity = $this->loadEntity($document, $type, $config['entity_type']);

        $document->number = $document->invoice_number
            ?? $document->order_number
            ?? $document->quote_number
            ?? $document->receipt_number
            ?? $document->credit_note_number
            ?? $document->grn_number
            ?? $document->id;

        $document->issue_date = $document->issue_date
            ?? $document->order_date
            ?? $document->created_at
            ?? now();

        $document->delivery_date = $document->delivery_date
            ?? $document->expected_date
            ?? null;

        $document->payment_terms = $document->payment_terms ?? null;

        $pdfContent = $this->pdf->renderBladeAsPdf("pdfs.{$viewFolder}.{$template}", [
            'document'   => $document,
            'items'      => $items,
            'workspace'  => $workspace,
            'entity'     => $entity,
            'entityType' => $config['entity_type'],
        ]);

        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$viewFolder}-{$document->number}.pdf\"",
        ]);
    }

    private function loadEntity(object $document, string $type, string $entityType): object
    {
        $nameCol    = $entityType === 'supplier' ? 'supplier_name' : 'customer_name';
        $emailCol   = $entityType === 'supplier' ? 'supplier_email' : 'customer_email';
        $addressCol = $entityType === 'supplier' ? null : 'billing_address';

        $entity = (object) [
            'name'    => $document->{$nameCol} ?? 'N/A',
            'email'   => $document->{$emailCol} ?? null,
            'phone'   => $document->phone ?? null,
            'address' => null,
        ];

        if ($addressCol && isset($document->{$addressCol})) {
            $entity->address = $document->{$addressCol};
        }

        if ($entityType === 'supplier' && isset($document->shipping_address)) {
            $entity->address = $document->shipping_address;
        }

        $companyIdCol = $entityType === 'supplier' ? 'supplier_company_id' : 'customer_company_id';
        if (isset($document->{$companyIdCol})) {
            $company = DB::table('crm_companies')
                ->where('id', $document->{$companyIdCol})
                ->first();
            if ($company) {
                $entity->name    = $company->name ?? $entity->name;
                $entity->email   = $company->email ?? $entity->email;
                $entity->phone   = $company->phone ?? $entity->phone;
                $entity->address = $entity->address ?? $company->country ?? null;
            }
        }

        return $entity;
    }
}
