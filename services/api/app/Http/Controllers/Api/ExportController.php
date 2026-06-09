<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Exports\EntityExport;
use App\Core\Http\Controllers\Controller;
use App\Modules\Accounting\Models\Account;
use App\Modules\Accounting\Models\JournalEntry;
use App\Modules\CRM\Models\CrmCompany;
use App\Modules\CRM\Models\CrmContact;
use App\Modules\CRM\Models\CrmDeal;
use App\Modules\CRM\Models\CrmLead;
use App\Modules\CRM\Models\CrmProduct;
use App\Modules\CRM\Models\CrmQuote;
use App\Modules\HSSE\Models\CorrectiveAction;
use App\Modules\HSSE\Models\Hazard;
use App\Modules\HSSE\Models\Incident;
use App\Modules\PTW\Models\Permit;
use App\Modules\Support\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class ExportController extends Controller
{
    public function export(Request $request, string $workspaceId, string $entity, string $format)
    {
        if (! in_array($format, ['xlsx', 'csv', 'json'], true)) {
            abort(400, 'Unsupported format. Accepted: xlsx, csv, json.');
        }

        $config = $this->getEntityConfig($entity);

        if ($entity === 'employees') {
            $rows = DB::table('workspace_members')
                ->join('users', 'workspace_members.user_id', '=', 'users.id')
                ->where('workspace_members.workspace_id', $workspaceId)
                ->where('workspace_members.status', 'active')
                ->select($config['columns'])
                ->orderBy('users.name')
                ->get()
                ->toArray();
            $headings = $config['headings'];
            $data = [];
            foreach ($rows as $row) {
                $data[] = (array) $row;
            }
        } else {
            $modelClass = $config['model'];
            $records = $modelClass::query()
                ->where('workspace_id', $workspaceId)
                ->select($config['columns'])
                ->orderByDesc('created_at')
                ->get()
                ->toArray();
            $headings = $config['headings'];
            $data = array_map(fn (array $row) => array_values($row), $records);
        }

        $filename = "{$entity}-export.".$format;

        if ($format === 'json') {
            return response()->json(['data' => $data, 'columns' => $headings])
                ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
        }

        $export = new EntityExport($data, $headings);

        if ($format === 'csv') {
            return Excel::download($export, $filename, \Maatwebsite\Excel\Excel::CSV);
        }

        return Excel::download($export, $filename, \Maatwebsite\Excel\Excel::XLSX);
    }

    private function getEntityConfig(string $entity): array
    {
        $configs = [
            'deals' => [
                'model' => CrmDeal::class,
                'columns' => ['title', 'value', 'currency', 'probability', 'expected_close_date', 'won_at', 'lost_at', 'forecast_category', 'stage_id', 'owner_id'],
                'headings' => ['Title', 'Value', 'Currency', 'Probability', 'Expected Close Date', 'Won At', 'Lost At', 'Forecast Category', 'Stage ID', 'Owner ID'],
            ],
            'leads' => [
                'model' => CrmLead::class,
                'columns' => ['first_name', 'last_name', 'email', 'phone', 'company_name', 'source', 'status', 'score', 'assigned_to'],
                'headings' => ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Source', 'Status', 'Score', 'Assigned To'],
            ],
            'contacts' => [
                'model' => CrmContact::class,
                'columns' => ['first_name', 'last_name', 'email', 'phone', 'job_title', 'lifecycle_stage', 'source', 'lead_score', 'company_id'],
                'headings' => ['First Name', 'Last Name', 'Email', 'Phone', 'Job Title', 'Lifecycle Stage', 'Source', 'Lead Score', 'Company ID'],
            ],
            'companies' => [
                'model' => CrmCompany::class,
                'columns' => ['name', 'domain', 'industry', 'size', 'website', 'billing_email', 'tax_id', 'employee_count'],
                'headings' => ['Name', 'Domain', 'Industry', 'Size', 'Website', 'Billing Email', 'Tax ID', 'Employee Count'],
            ],
            'hazards' => [
                'model' => Hazard::class,
                'columns' => ['reference', 'title', 'category', 'location', 'risk_level', 'status', 'owner_id', 'next_review_date'],
                'headings' => ['Reference', 'Title', 'Category', 'Location', 'Risk Level', 'Status', 'Owner ID', 'Next Review Date'],
            ],
            'incidents' => [
                'model' => Incident::class,
                'columns' => ['reference', 'title', 'type', 'severity', 'status', 'location', 'occurred_at', 'reported_at'],
                'headings' => ['Reference', 'Title', 'Type', 'Severity', 'Status', 'Location', 'Occurred At', 'Reported At'],
            ],
            'corrective-actions' => [
                'model' => CorrectiveAction::class,
                'columns' => ['reference', 'source_type', 'description', 'priority', 'status', 'assigned_to', 'due_date', 'completed_at'],
                'headings' => ['Reference', 'Source Type', 'Description', 'Priority', 'Status', 'Assigned To', 'Due Date', 'Completed At'],
            ],
            'products' => [
                'model' => CrmProduct::class,
                'columns' => ['name', 'description', 'sku', 'unit_price', 'currency', 'category', 'is_active'],
                'headings' => ['Name', 'Description', 'SKU', 'Unit Price', 'Currency', 'Category', 'Active'],
            ],
            'quotes' => [
                'model' => CrmQuote::class,
                'columns' => ['quote_number', 'status', 'subtotal', 'discount', 'tax', 'total', 'currency', 'valid_until'],
                'headings' => ['Quote Number', 'Status', 'Subtotal', 'Discount', 'Tax', 'Total', 'Currency', 'Valid Until'],
            ],
            'employees' => [
                'model' => null,
                'columns' => ['users.name as name', 'users.email', 'workspace_members.role', 'workspace_members.job_title', 'workspace_members.department', 'workspace_members.phone'],
                'headings' => ['Name', 'Email', 'Role', 'Job Title', 'Department', 'Phone'],
            ],
            'tickets' => [
                'model' => Ticket::class,
                'columns' => ['subject', 'status', 'priority', 'channel', 'assigned_to', 'source', 'sla_due_at', 'closed_at'],
                'headings' => ['Subject', 'Status', 'Priority', 'Channel', 'Assigned To', 'Source', 'SLA Due At', 'Closed At'],
            ],
            'permits' => [
                'model' => Permit::class,
                'columns' => ['reference', 'type', 'status', 'title', 'location', 'risk_level', 'valid_from', 'valid_until'],
                'headings' => ['Reference', 'Type', 'Status', 'Title', 'Location', 'Risk Level', 'Valid From', 'Valid Until'],
            ],
            'accounts' => [
                'model' => Account::class,
                'columns' => ['code', 'name', 'type', 'description', 'is_active'],
                'headings' => ['Code', 'Name', 'Type', 'Description', 'Active'],
            ],
            'journal-entries' => [
                'model' => JournalEntry::class,
                'columns' => ['entry_date', 'description', 'debit_amount', 'credit_amount', 'reference_type', 'reference_id', 'status'],
                'headings' => ['Entry Date', 'Description', 'Debit Amount', 'Credit Amount', 'Reference Type', 'Reference ID', 'Status'],
            ],
        ];

        if (! isset($configs[$entity])) {
            abort(404, "Unknown entity: {$entity}");
        }

        return $configs[$entity];
    }
}
