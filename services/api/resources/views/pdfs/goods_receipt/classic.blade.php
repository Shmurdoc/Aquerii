<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width">
    <title>Goods Receipt Note {{ $document->number }}</title>
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

        .doc-title { font-size: 26px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
        .doc-number { font-size: 13px; color: #555; }

        .status-badge {
            display: inline-block; padding: 2px 8px; border: 1px solid currentColor;
            font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px;
        }

        .status-draft   { color: #92400e; }
        .status-complete { color: #065f46; }
        .status-void    { color: #6b7280; }

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

        table.items { width: 100%; border-collapse: collapse; margin-bottom: 0; }

        table.items thead tr { border-top: 2px solid #1a1a1a; border-bottom: 1px solid #1a1a1a; }

        table.items thead th {
            padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.8px;
        }

        table.items thead th.num { text-align: right; }
        table.items thead th.center { text-align: center; }

        table.items tbody td {
            padding: 9px 10px; font-size: 13px; color: #333;
            border-bottom: 1px solid #e5e5e5; vertical-align: top;
        }

        table.items tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
        table.items tbody td.center { text-align: center; }

        .accepted-yes { color: #065f46; font-weight: 700; }
        .accepted-no  { color: #991b1b; font-weight: 700; }
        .accepted-partial { color: #92400e; font-weight: 700; }

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
        <span class="doc-title">Goods Receipt Note</span>
        <div style="text-align:right">
            <div class="doc-number">{{ $document->number }}</div>
            @php $statusClass = 'status-' . ($document->status ?? 'draft'); @endphp
            <span class="status-badge {{ $statusClass }}">{{ ucfirst($document->status ?? 'draft') }}</span>
        </div>
    </div>

    <div class="body">

        <div class="parties">
            <div class="party">
                <div class="party-label">Supplier</div>
                <div class="party-name">{{ $entity->name ?? 'N/A' }}</div>
                @if(!empty($entity->email))
                    <div class="party-detail">{{ $entity->email }}</div>
                @endif
                @if(!empty($entity->address))
                    <div class="party-detail">{{ $entity->address }}</div>
                @endif
            </div>
            <div class="party">
                <div class="party-label">Receipt Details</div>
                <div class="party-detail">
                    <strong>Received Date:</strong> {{ \Carbon\Carbon::parse($document->received_date ?? $document->issue_date)->format('d F Y') }}<br>
                    <strong>Received By:</strong> {{ $document->received_by ?? 'N/A' }}<br>
                    @if(!empty($document->purchase_order_number))<strong>PO:</strong> {{ $document->purchase_order_number }}@endif
                </div>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th class="num" style="width:8%">Rcvd Qty</th>
                    <th style="width:44%">Description</th>
                    <th class="center" style="width:12%">Accepted</th>
                    <th style="width:36%">Notes</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $item)
                <tr>
                    <td class="num">{{ $item->received_quantity ?? $item->quantity }}</td>
                    <td>{{ $item->description }}</td>
                    @php $accepted = $item->accepted ?? 'yes'; @endphp
                    <td class="center"><span class="accepted-{{ $accepted }}">{{ ucfirst($accepted) }}</span></td>
                    <td>{{ $item->notes ?? '' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

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
