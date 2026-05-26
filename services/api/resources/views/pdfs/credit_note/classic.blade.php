<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width">
    <title>Credit Note {{ $document->number }}</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 13px; color: #1a1a1a; background: #ffffff; line-height: 1.6;
        }

        .header { text-align: center; padding: 36px 48px 24px; border-bottom: 2px solid #1a1a1a; }

        .logo-img { height: 56px; width: auto; object-fit: contain; margin-bottom: 10px; }

        .logo-initials {
            display: inline-flex; align-items: center; justify-content: center;
            width: 56px; height: 56px; border: 2px solid #1a1a1a; border-radius: 4px;
            font-size: 20px; font-weight: 700; letter-spacing: 1px; margin-bottom: 10px;
        }

        .workspace-name { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
        .workspace-sub { font-size: 11px; color: #555; font-style: italic; }

        .title-row {
            padding: 20px 48px; display: flex; justify-content: space-between;
            align-items: baseline; border-bottom: 1px solid #cccccc;
        }

        .doc-title { font-size: 26px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #991b1b; }
        .doc-number { font-size: 13px; color: #555; }

        .status-badge {
            display: inline-block; padding: 2px 8px; border: 1px solid currentColor;
            font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px;
        }

        .status-draft  { color: #92400e; }
        .status-issued { color: #991b1b; }
        .status-applied { color: #065f46; }
        .status-void   { color: #6b7280; }

        .body { padding: 28px 48px 0; }

        .parties { display: flex; justify-content: space-between; margin-bottom: 28px; gap: 32px; }
        .party { flex: 1; }

        .party-label {
            font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;
            color: #555; border-bottom: 1px solid #cccccc; padding-bottom: 4px; margin-bottom: 8px;
        }

        .party-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
        .party-detail { font-size: 12px; color: #555; line-height: 1.6; }

        .meta-block { display: flex; gap: 32px; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid #cccccc; }

        .meta-item .label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 2px; }
        .meta-item .value { font-size: 13px; font-weight: 600; }

        .meta-item .value.reason {
            color: #991b1b; font-weight: 700;
        }

        table.items { width: 100%; border-collapse: collapse; margin-bottom: 0; }

        table.items thead tr { border-top: 2px solid #1a1a1a; border-bottom: 1px solid #1a1a1a; }
        table.items thead tr th { color: #991b1b; }

        table.items thead th {
            padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.8px;
        }

        table.items thead th.num { text-align: right; }

        table.items tbody td {
            padding: 9px 10px; font-size: 13px; color: #333;
            border-bottom: 1px solid #e5e5e5; vertical-align: top;
        }

        table.items tbody td.num {
            text-align: right; font-variant-numeric: tabular-nums;
            font-family: 'Courier New', monospace; font-size: 12px;
        }

        table.items tbody td.neg { color: #991b1b; }

        .totals-wrapper { display: flex; justify-content: flex-end; padding: 0 0 32px; }
        .totals-box { width: 260px; border: 1px solid #1a1a1a; }

        .totals-row {
            display: flex; justify-content: space-between; padding: 7px 12px;
            border-bottom: 1px solid #e5e5e5; font-size: 13px;
        }

        .totals-row:last-child {
            border-bottom: none; border-top: 2px solid #1a1a1a; font-weight: 700; font-size: 14px; background: #fef2f2;
        }

        .totals-row .t-value { font-family: 'Courier New', monospace; font-size: 12px; }
        .totals-row:last-child .t-value { font-size: 14px; color: #991b1b; }

        .notes-section { padding: 0 48px 32px; }

        .notes-label {
            font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;
            color: #555; border-bottom: 1px solid #cccccc; padding-bottom: 4px; margin-bottom: 8px;
        }

        .notes-text { font-size: 12px; color: #555; line-height: 1.7; font-style: italic; }

        .footer {
            padding: 14px 48px; border-top: 2px solid #1a1a1a;
            display: flex; justify-content: space-between; font-size: 11px; color: #888; font-style: italic;
        }
    </style>
</head>
<body>

    <div class="header">
        @if(!empty($workspace->logo_url))
            <div><img class="logo-img" src="{{ $workspace->logo_url }}" alt="{{ $workspace->name }}"></div>
        @else
            <div><span class="logo-initials">{{ strtoupper(substr($workspace->name, 0, 2)) }}</span></div>
        @endif
        <div class="workspace-name">{{ $workspace->name }}</div>
        @php $wsSettings = $workspace->settings ?? []; @endphp
        @if(!empty($wsSettings['address']))
            <div class="workspace-sub">{{ $wsSettings['address'] }}</div>
        @endif
        @if(!empty($wsSettings['vat_number']))
            <div class="workspace-sub">VAT No: {{ $wsSettings['vat_number'] }}</div>
        @endif
    </div>

    <div class="title-row">
        <span class="doc-title">Credit Note</span>
        <div style="text-align:right">
            <div class="doc-number">{{ $document->number }}</div>
            @php $statusClass = 'status-' . ($document->status ?? 'draft'); @endphp
            <span class="status-badge {{ $statusClass }}">{{ ucfirst($document->status ?? 'draft') }}</span>
        </div>
    </div>

    <div class="body">

        <div class="parties">
            <div class="party">
                <div class="party-label">Customer</div>
                <div class="party-name">{{ $entity->name ?? 'N/A' }}</div>
                @if(!empty($entity->email))
                    <div class="party-detail">{{ $entity->email }}</div>
                @endif
                @if(!empty($entity->address))
                    <div class="party-detail">{{ $entity->address }}</div>
                @endif
            </div>
            <div class="party">
                <div class="party-label">Credit Details</div>
                <div class="party-detail">
                    <strong>Date:</strong> {{ \Carbon\Carbon::parse($document->issue_date)->format('d F Y') }}<br>
                    @if(!empty($document->invoice_number))<strong>Original Invoice:</strong> {{ $document->invoice_number }}<br>@endif
                    <strong>Reason:</strong> <span style="color:#991b1b">{{ $document->credit_reason ?? 'N/A' }}</span><br>
                    @if(!empty($document->currency))<strong>Currency:</strong> {{ $document->currency }}@endif
                </div>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th style="width:50%">Description</th>
                    <th class="num" style="width:12%">Qty</th>
                    <th class="num" style="width:18%">Unit Price</th>
                    <th class="num" style="width:20%">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="num">{{ $item->quantity }}</td>
                    <td class="num">{{ number_format($item->unit_price, 2) }}</td>
                    <td class="num neg">({{ number_format(abs($item->total), 2) }})</td>
                </tr>
                @endforeach
            </tbody>
        </table>

    </div>

    <div class="totals-wrapper" style="padding: 0 48px 0;">
        <div class="totals-box">
            <div class="totals-row">
                <span>Subtotal</span>
                <span class="t-value">({{ number_format(abs($document->subtotal), 2) }})</span>
            </div>
            @if(!empty($document->tax_total) && $document->tax_total > 0)
            <div class="totals-row">
                <span>Tax</span>
                <span class="t-value">({{ number_format(abs($document->tax_total), 2) }})</span>
            </div>
            @endif
            <div class="totals-row">
                <span>Credit Total</span>
                <span class="t-value">({{ number_format(abs($document->total), 2) }})</span>
            </div>
        </div>
    </div>

    @if(!empty($document->notes))
    <div class="notes-section" style="padding-top: 24px;">
        <div class="notes-label">Notes</div>
        <div class="notes-text">{{ $document->notes }}</div>
    </div>
    @endif

    <div class="footer">
        <span>{{ $workspace->name }}@if(!empty($wsSettings['vat_number'])) &mdash; VAT {{ $wsSettings['vat_number'] }}@endif</span>
        <span>Page 1 of 1</span>
    </div>

</body>
</html>
