<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>DMR Section 23 — Dangerous Occurrence Report</title>
    <style>
        @page { margin: 15mm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 10pt; color: #1a1a1a; line-height: 1.4; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
        .header h1 { font-size: 14pt; margin: 0 0 4px; text-transform: uppercase; }
        .header h2 { font-size: 11pt; margin: 0; font-weight: normal; }
        .header .ref { font-size: 9pt; color: #555; margin-top: 4px; }
        .section { margin-bottom: 14px; }
        .section-title { font-size: 10pt; font-weight: bold; border-bottom: 1px solid #999; margin-bottom: 6px; padding-bottom: 2px; }
        .field { margin-bottom: 3px; }
        .field-label { font-weight: bold; font-size: 9pt; color: #444; }
        .field-value { font-size: 10pt; padding-left: 4px; }
        .grid-2 { display: flex; gap: 20px; }
        .grid-2 > div { flex: 1; }
        .field-box { border: 1px solid #ccc; padding: 6px 8px; margin-bottom: 6px; min-height: 18px; }
        .actions-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .actions-table th, .actions-table td { border: 1px solid #aaa; padding: 4px 6px; text-align: left; font-size: 9pt; }
        .actions-table th { background: #eee; }
        .footer { margin-top: 20px; border-top: 1px solid #999; padding-top: 8px; font-size: 8pt; color: #666; text-align: center; }
    </style>
</head>
<body>

<div class="header">
    <h1>Dangerous Occurrence Report</h1>
    <h2>Section 23 — Mine Health and Safety Act, 1996 (Act No. 29 of 1996)</h2>
    <div class="ref">DMR Reference: {{ $incident->coida_reference ?? $incident->reference ?? 'N/A' }}</div>
</div>

<div class="section">
    <div class="section-title">1. Incident Information</div>
    <div class="grid-2">
        <div>
            <div class="field"><span class="field-label">Incident Reference:</span> <span class="field-value">{{ $incident->reference ?? 'N/A' }}</span></div>
            <div class="field"><span class="field-label">Type:</span> <span class="field-value">{{ ucfirst(str_replace('_', ' ', $incident->type)) }}</span></div>
            <div class="field"><span class="field-label">Severity:</span> <span class="field-value">{{ ucfirst($incident->severity) }}</span></div>
        </div>
        <div>
            <div class="field"><span class="field-label">Date / Time:</span> <span class="field-value">{{ $incident->occurred_at?->format('d M Y H:i') ?? 'N/A' }}</span></div>
            <div class="field"><span class="field-label">Reported:</span> <span class="field-value">{{ $incident->reported_at?->format('d M Y H:i') ?? 'N/A' }}</span></div>
            <div class="field"><span class="field-label">Status:</span> <span class="field-value">{{ ucfirst(str_replace('_', ' ', $incident->status)) }}</span></div>
        </div>
    </div>
</div>

<div class="section">
    <div class="section-title">2. Location</div>
    <div class="field-box">
        <div class="field"><span class="field-label">Location:</span> <span class="field-value">{{ $incident->location ?? 'N/A' }}</span></div>
        @if($incident->location_details)
            @foreach((array) $incident->location_details as $key => $value)
                <div class="field"><span class="field-label">{{ ucfirst($key) }}:</span> <span class="field-value">{{ $value }}</span></div>
            @endforeach
        @endif
    </div>
</div>

<div class="section">
    <div class="section-title">3. Description of the Occurrence</div>
    <div class="field-box">
        <div class="field"><span class="field-label">Title:</span> <span class="field-value">{{ $incident->title ?? 'N/A' }}</span></div>
        <div class="field" style="margin-top:4px;"><span class="field-label">Details:</span></div>
        <div class="field-value">{{ $incident->description ?? 'No description provided.' }}</div>
    </div>
</div>

<div class="section">
    <div class="section-title">4. Injured Workers</div>
    <div class="field-box">
        @php $reporter = $incident->reporter; @endphp
        @if($reporter)
            <div class="field"><span class="field-label">Reporter:</span> <span class="field-value">{{ $reporter->name }} ({{ $reporter->email }})</span></div>
        @endif
        @php $investigator = $incident->investigator; @endphp
        @if($investigator)
            <div class="field"><span class="field-label">Investigator:</span> <span class="field-value">{{ $investigator->name }} ({{ $investigator->email }})</span></div>
        @endif
        @if(isset($workers) && count($workers))
            @foreach($workers as $worker)
                <div class="field"><span class="field-label">Worker:</span> <span class="field-value">{{ $worker['name'] ?? $worker }} ({{ $worker['role'] ?? 'N/A' }})</span></div>
            @endforeach
        @else
            <div class="field"><span class="field-value">No injured workers recorded.</span></div>
        @endif
    </div>
</div>

<div class="section">
    <div class="section-title">5. Witnesses</div>
    <div class="field-box">
        @if(isset($witnesses) && count($witnesses))
            @foreach($witnesses as $witness)
                <div class="field"><span class="field-value">{{ $witness['name'] ?? $witness }} — {{ $witness['statement'] ?? 'Statement pending' }}</span></div>
            @endforeach
        @else
            <div class="field"><span class="field-value">No witnesses recorded.</span></div>
        @endif
    </div>
</div>

<div class="section">
    <div class="section-title">6. Causes</div>
    <div class="grid-2">
        <div>
            <div class="field-label">Immediate Cause(s)</div>
            <div class="field-box">{{ $incident->immediate_cause ?? 'Not specified' }}</div>
        </div>
        <div>
            <div class="field-label">Root Cause(s)</div>
            <div class="field-box">{{ $incident->root_cause ?? 'Not specified' }}</div>
        </div>
    </div>
    @if($incident->contributing_factors)
        <div style="margin-top:6px;">
            <div class="field-label">Contributing Factors</div>
            <div class="field-box">
                @foreach((array) $incident->contributing_factors as $factor)
                    <div>{{ $factor }}</div>
                @endforeach
            </div>
        </div>
    @endif
</div>

<div class="section">
    <div class="section-title">7. Corrective / Preventive Actions Taken</div>
    <table class="actions-table">
        <thead>
            <tr>
                <th style="width:5%;">#</th>
                <th style="width:30%;">Description</th>
                <th style="width:15%;">Assignee</th>
                <th style="width:12%;">Priority</th>
                <th style="width:12%;">Status</th>
                <th style="width:12%;">Due Date</th>
            </tr>
        </thead>
        <tbody>
            @forelse($incident->correctiveActions as $i => $action)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $action->description }}</td>
                    <td>{{ $action->assignee?->name ?? 'Unassigned' }}</td>
                    <td>{{ ucfirst($action->priority) }}</td>
                    <td>{{ ucfirst(str_replace('_', ' ', $action->status)) }}</td>
                    <td>{{ $action->due_date?->format('d M Y') ?? '—' }}</td>
                </tr>
            @empty
                <tr><td colspan="6">No corrective actions recorded.</td></tr>
            @endforelse
        </tbody>
    </table>
</div>

<div class="section">
    <div class="section-title">8. Classification</div>
    <div class="field-box">
        <div class="field"><span class="field-label">MHSA Classification:</span> <span class="field-value">{{ $incident->mhsa_classification ?? 'Not classified' }}</span></div>
        <div class="field"><span class="field-label">COIDA Reportable:</span> <span class="field-value">{{ $incident->coida_reportable ? 'Yes' : 'No' }}</span></div>
        @if($incident->coida_reference)
            <div class="field"><span class="field-label">COIDA Reference:</span> <span class="field-value">{{ $incident->coida_reference }}</span></div>
        @endif
    </div>
</div>

<div class="footer">
    <p>Generated by Aquerii FlowOS on {{ now()->format('d M Y H:i') }}</p>
    <p>This report is auto-populated from the incident record and may require manual verification.</p>
</div>

</body>
</html>
