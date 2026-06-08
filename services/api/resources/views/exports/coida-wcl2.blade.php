<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>COIDA W.Cl.2 — First Medical Report</title>
    <style>
        @page { margin: 12mm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 10pt; color: #1a1a1a; line-height: 1.35; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 14px; }
        .header h1 { font-size: 13pt; margin: 0 0 2px; text-transform: uppercase; }
        .header h2 { font-size: 10pt; margin: 0; font-weight: normal; }
        .header .sub { font-size: 8pt; color: #555; }
        .section { margin-bottom: 12px; }
        .section-title { font-size: 10pt; font-weight: bold; border-bottom: 1px solid #999; margin-bottom: 5px; padding-bottom: 2px; background: #f0f0f0; padding: 3px 6px; }
        .grid-2 { display: flex; gap: 16px; }
        .grid-2 > div { flex: 1; }
        .field { margin-bottom: 2px; padding: 2px 0; }
        .field-label { font-weight: bold; font-size: 8.5pt; color: #444; }
        .field-value { font-size: 10pt; }
        .field-box { border-bottom: 1px solid #ccc; padding: 4px 6px; margin-bottom: 4px; min-height: 20px; }
        .field-inline { display: flex; }
        .field-inline .field-label { width: 140px; flex-shrink: 0; }
        .field-inline .field-value { flex: 1; border-bottom: 1px solid #ccc; padding: 2px 4px; }
        .footer { margin-top: 16px; border-top: 1px solid #999; padding-top: 6px; font-size: 8pt; color: #666; text-align: center; }
        .declaration { border: 1px solid #aaa; padding: 8px; margin-top: 10px; font-size: 9pt; }
    </style>
</head>
<body>

<div class="header">
    <h1>Compensation for Occupational Injuries and Diseases Act</h1>
    <h2>W.Cl.2 — First Medical Report (Section 38)</h2>
    <div class="sub">Compensation Fund, South Africa</div>
</div>

<div class="section">
    <div class="section-title">A. Employer Details</div>
    <div class="field-inline"><span class="field-label">Employer Name:</span><span class="field-value">{{ $employer['name'] ?? $workspace->name ?? 'N/A' }}</span></div>
    <div class="field-inline"><span class="field-label">Registration No:</span><span class="field-value">{{ $employer['registration_number'] ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Sector / Industry:</span><span class="field-value">{{ $employer['sector'] ?? 'Mining' }}</span></div>
    <div class="field-inline"><span class="field-label">Workplace Address:</span><span class="field-value">{{ $employer['address'] ?? $workspace->address ?? '—' }}</span></div>
</div>

<div class="section">
    <div class="section-title">B. Injured Worker Details</div>
    <div class="field-inline"><span class="field-label">Full Name:</span><span class="field-value">{{ $worker['name'] ?? $incident->reporter?->name ?? 'N/A' }}</span></div>
    <div class="field-inline"><span class="field-label">ID / Passport No:</span><span class="field-value">{{ $worker['id_number'] ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Occupation:</span><span class="field-value">{{ $worker['occupation'] ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Date of Birth:</span><span class="field-value">{{ isset($worker['dob']) ? \Carbon\Carbon::parse($worker['dob'])->format('d M Y') : '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Contact Number:</span><span class="field-value">{{ $worker['phone'] ?? $incident->reporter?->phone ?? '—' }}</span></div>
</div>

<div class="section">
    <div class="section-title">C. Incident Details</div>
    <div class="field-inline"><span class="field-label">Date of Incident:</span><span class="field-value">{{ $incident->occurred_at?->format('d M Y') ?? 'N/A' }}</span></div>
    <div class="field-inline"><span class="field-label">Time of Incident:</span><span class="field-value">{{ $incident->occurred_at?->format('H:i') ?? 'N/A' }}</span></div>
    <div class="field-inline"><span class="field-label">Location of Incident:</span><span class="field-value">{{ $incident->location ?? 'N/A' }}</span></div>
    <div class="field-inline"><span class="field-label">MHSA Classification:</span><span class="field-value">{{ $incident->mhsa_classification ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Incident Reference:</span><span class="field-value">{{ $incident->reference ?? '—' }}</span></div>
</div>

<div class="section">
    <div class="section-title">D. Nature of Injury</div>
    <div class="field-inline"><span class="field-label">Type of Injury:</span><span class="field-value">{{ $incident->injury_type ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Body Part Affected:</span><span class="field-value">{{ $incident->body_part_affected ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Injury Description:</span><span class="field-value">{{ $incident->description ?? '—' }}</span></div>
</div>

<div class="section">
    <div class="section-title">E. Medical Treatment</div>
    <div class="field-inline"><span class="field-label">Treatment Provided:</span><span class="field-value">{{ $medical['treatment'] ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Referred to:</span><span class="field-value">{{ $medical['referred_to'] ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Date of First Treatment:</span><span class="field-value">{{ isset($medical['treatment_date']) ? \Carbon\Carbon::parse($medical['treatment_date'])->format('d M Y') : $incident->occurred_at?->format('d M Y') ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Hospitalised:</span><span class="field-value">{{ ($medical['hospitalised'] ?? false) ? 'Yes' : 'No' }}</span></div>
    @if($medical['hospitalised'] ?? false)
        <div class="field-inline"><span class="field-label">Hospital Name:</span><span class="field-value">{{ $medical['hospital_name'] ?? '—' }}</span></div>
        <div class="field-inline"><span class="field-label">Admission Date:</span><span class="field-value">{{ isset($medical['admission_date']) ? \Carbon\Carbon::parse($medical['admission_date'])->format('d M Y') : '—' }}</span></div>
    @endif
</div>

<div class="section">
    <div class="section-title">F. Medical Practitioner</div>
    <div class="field-inline"><span class="field-label">Name:</span><span class="field-value">{{ $doctor['name'] ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Practice No:</span><span class="field-value">{{ $doctor['practice_number'] ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Contact:</span><span class="field-value">{{ $doctor['phone'] ?? '—' }}</span></div>
    <div class="field-inline"><span class="field-label">Address:</span><span class="field-value">{{ $doctor['address'] ?? '—' }}</span></div>
</div>

<div class="declaration">
    <strong>Declaration by Medical Practitioner</strong>
    <p style="margin:4px 0; font-size:9pt;">
        I, <u>&nbsp;{{ $doctor['name'] ?? '________________________' }}&nbsp;</u>, certify that I have examined
        <u>&nbsp;{{ $worker['name'] ?? $incident->reporter?->name ?? '________________________' }}&nbsp;</u>
        and that the above details are true and correct to the best of my knowledge.
    </p>
    <div style="display:flex; justify-content:space-between; margin-top:8px;">
        <span>Signed: ________________________</span>
        <span>Date: {{ now()->format('d M Y') }}</span>
    </div>
</div>

<div class="footer">
    <p>Generated by Aquerii FlowOS on {{ now()->format('d M Y H:i') }} — W.Cl.2 First Medical Report</p>
    <p>This form is pre-populated from incident data and must be verified by a medical practitioner.</p>
</div>

</body>
</html>
