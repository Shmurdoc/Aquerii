<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use App\Core\Services\PdfService;
use App\Modules\HSSE\Models\Incident;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DmrExportController extends Controller
{
    public function __construct(private PdfService $pdf) {}

    public function dmr(Request $request, string $workspaceId, Incident $incident): Response
    {
        abort_if($incident->workspace_id !== $workspaceId, 404);

        $incident->loadMissing(['reporter', 'investigator', 'correctiveActions.assignee']);

        $workers = $request->input('workers', []);
        $witnesses = $request->input('witnesses', []);

        $pdfContent = $this->pdf->renderBladeAsPdf('exports.dmr-section23', [
            'incident' => $incident,
            'workers' => $workers,
            'witnesses' => $witnesses,
        ]);

        $filename = 'dmr-section23-'.($incident->reference ?? $incident->id).'.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    public function coida(Request $request, string $workspaceId, Incident $incident): Response
    {
        abort_if($incident->workspace_id !== $workspaceId, 404);

        $incident->loadMissing(['reporter', 'investigator']);

        $employer = $request->input('employer', []);
        $worker = $request->input('worker', []);
        $medical = $request->input('medical', []);
        $doctor = $request->input('doctor', []);

        $pdfContent = $this->pdf->renderBladeAsPdf('exports.coida-wcl2', [
            'incident' => $incident,
            'employer' => $employer,
            'worker' => $worker,
            'medical' => $medical,
            'doctor' => $doctor,
            'workspace' => $incident->workspace,
        ]);

        $filename = 'coida-wcl2-'.($incident->reference ?? $incident->id).'.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }
}
