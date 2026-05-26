<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width">
    <title>Sales Order {{ $document->number }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root { --accent: {{ $workspace->color ?? '#7c3aed' }}; }

        body {
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            color: #1a1a2e;
            background: #ffffff;
            line-height: 1.5;
        }

        .header-band {
            background: var(--accent);
            padding: 28px 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .logo-area {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .logo-img {
            height: 48px;
            width: 48px;
            object-fit: contain;
            border-radius: 8px;
            background: rgba(255,255,255,0.15);
        }

        .logo-initials {
            height: 48px;
            width: 48px;
            border-radius: 8px;
            background: rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 1px;
        }

        .workspace-name {
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.3px;
        }

        .doc-label { text-align: right; }

        .doc-label h1 {
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.5px;
        }

        .doc-label .doc-number {
            font-size: 13px;
            color: rgba(255,255,255,0.75);
            font-weight: 500;
            margin-top: 2px;
        }

        .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 6px;
        }

        .status-draft    { background: #fef3c7; color: #92400e; }
        .status-confirmed { background: #dbeafe; color: #1e40af; }
        .status-shipped  { background: #d1fae5; color: #065f46; }
        .status-cancelled{ background: #fee2e2; color: #991b1b; }
        .status-void     { background: #f3f4f6; color: #6b7280; }

        .body { padding: 32px 40px 0; }

        .parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 32px;
            gap: 24px;
        }

        .party { flex: 1; }

        .party-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #9ca3af;
            margin-bottom: 6px;
        }

        .party-name {
            font-size: 15px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
        }

        .party-detail {
            color: #6b7280;
            font-size: 12px;
            line-height: 1.6;
        }

        .meta-strip {
            display: flex;
            gap: 0;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 32px;
        }

        .meta-cell {
            flex: 1;
            padding: 12px 18px;
            border-right: 1px solid #e5e7eb;
        }

        .meta-cell:last-child { border-right: none; }

        .meta-cell .label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #9ca3af;
            margin-bottom: 3px;
        }

        .meta-cell .value {
            font-size: 13px;
            font-weight: 600;
            color: #111827;
        }

        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
        }

        table.items thead tr { background: var(--accent); }

        table.items thead th {
            padding: 10px 14px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: rgba(255,255,255,0.9);
        }

        table.items thead th.num { text-align: right; }

        table.items tbody tr:nth-child(even) { background: #f9fafb; }
        table.items tbody tr:nth-child(odd) { background: #ffffff; }

        table.items tbody td {
            padding: 11px 14px;
            font-size: 13px;
            color: #374151;
            border-bottom: 1px solid #f3f4f6;
            vertical-align: top;
        }

        table.items tbody td.num {
            text-align: right;
            font-variant-numeric: tabular-nums;
        }

        table.items tbody td.desc {
            font-weight: 500;
            color: #111827;
        }

        .totals-wrapper {
            display: flex;
            justify-content: flex-end;
            padding: 0 0 32px;
        }

        .totals-table {
            width: 280px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }

        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 9px 16px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 13px;
            color: #6b7280;
        }

        .totals-row:last-child { border-bottom: none; }

        .totals-row.total-final {
            background: var(--accent);
            font-weight: 700;
            font-size: 15px;
            color: #ffffff;
        }

        .totals-row .t-label { font-weight: 500; }
        .totals-row .t-value { font-variant-numeric: tabular-nums; }

        .notes-section { padding: 0 40px 32px; }

        .notes-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #9ca3af;
            margin-bottom: 6px;
        }

        .notes-text {
            font-size: 12px;
            color: #6b7280;
            line-height: 1.6;
            border-left: 3px solid var(--accent);
            padding-left: 12px;
        }

        .footer {
            margin-top: auto;
            padding: 16px 40px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: #9ca3af;
        }

        .footer-accent-line { height: 4px; background: var(--accent); }

        .disclaimer {
            text-align: center;
            padding: 24px 40px 12px;
            font-size: 10px;
            color: #9ca3af;
            font-style: italic;
        }
    </style>
</head>
<body>

    <div class="header-band">
        <div class="logo-area">
            @if(!empty($workspace->logo_url))
                <img class="logo-img" src="{{ $workspace->logo_url }}" alt="{{ $workspace->name }}">
            @else
                <div class="logo-initials">{{ strtoupper(substr($workspace->name, 0, 2)) }}</div>
            @endif
            <span class="workspace-name">{{ $workspace->name }}</span>
        </div>
        <div class="doc-label">
            <h1>SALES ORDER</h1>
            <div class="doc-number">{{ $document->number }}</div>
            @php $statusClass = 'status-' . ($document->status ?? 'draft'); @endphp
            <span class="status-badge {{ $statusClass }}">{{ ucfirst($document->status ?? 'draft') }}</span>
        </div>
    </div>

    <div class="body">

        <div class="parties">
            <div class="party">
                <div class="party-label">From</div>
                <div class="party-name">{{ $workspace->name }}</div>
                @php $wsSettings = $workspace->settings ?? []; @endphp
                @if(!empty($wsSettings['address']))
                    <div class="party-detail">{{ $wsSettings['address'] }}</div>
                @endif
                @if(!empty($wsSettings['vat_number']))
                    <div class="party-detail">VAT: {{ $wsSettings['vat_number'] }}</div>
                @endif
            </div>
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
        </div>

        <div class="meta-strip">
            <div class="meta-cell">
                <div class="label">Order Date</div>
                <div class="value">{{ \Carbon\Carbon::parse($document->issue_date)->format('d M Y') }}</div>
            </div>
            <div class="meta-cell">
                <div class="label">Delivery Date</div>
                <div class="value">{{ !empty($document->delivery_date) ? \Carbon\Carbon::parse($document->delivery_date)->format('d M Y') : 'TBD' }}</div>
            </div>
            @if(!empty($document->currency))
            <div class="meta-cell">
                <div class="label">Currency</div>
                <div class="value">{{ $document->currency }}</div>
            </div>
            @endif
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
                    <td class="desc">{{ $item->description }}</td>
                    <td class="num">{{ $item->quantity }}</td>
                    <td class="num">{{ number_format($item->unit_price, 2) }}</td>
                    <td class="num">{{ number_format($item->total, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

    </div>

    <div class="totals-wrapper" style="padding: 0 40px 0;">
        <div class="totals-table">
            <div class="totals-row">
                <span class="t-label">Subtotal</span>
                <span class="t-value">{{ number_format($document->subtotal, 2) }}</span>
            </div>
            @if(!empty($document->tax_total) && $document->tax_total > 0)
            <div class="totals-row">
                <span class="t-label">Tax</span>
                <span class="t-value">{{ number_format($document->tax_total, 2) }}</span>
            </div>
            @endif
            @if(!empty($document->discount_total) && $document->discount_total > 0)
            <div class="totals-row">
                <span class="t-label">Discount</span>
                <span class="t-value">- {{ number_format($document->discount_total, 2) }}</span>
            </div>
            @endif
            <div class="totals-row total-final">
                <span class="t-label">Total</span>
                <span class="t-value">{{ number_format($document->total, 2) }}</span>
            </div>
        </div>
    </div>

    @if(!empty($document->notes))
    <div class="notes-section" style="padding-top: 24px;">
        <div class="notes-label">Notes</div>
        <div class="notes-text">{{ $document->notes }}</div>
    </div>
    @endif

    @if(!empty($wsSettings['bank_details']))
    <div class="notes-section" style="padding-top: 16px;">
        <div class="notes-label">Payment Details</div>
        <div class="notes-text">{{ $wsSettings['bank_details'] }}</div>
    </div>
    @endif

    <div class="disclaimer">Authorized signature required for acceptance.</div>

    <div class="footer-accent-line"></div>
    <div class="footer">
        <span>{{ $workspace->name }}</span>
        <span>Page 1 of 1</span>
    </div>

</body>
</html>
