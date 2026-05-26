<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width">
    <title>Sales Order {{ $document->number }}</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @if(($document->status ?? '') === 'draft')
        body::after {
            content: 'DRAFT';
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 120px; font-weight: 900;
            color: rgba(217, 119, 6, 0.10);
            letter-spacing: 8px; pointer-events: none; z-index: 0; white-space: nowrap;
        }
        @endif

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            font-size: 13px; color: #111; background: #ffffff; line-height: 1.5;
        }

        .page { padding: 48px 48px 0; position: relative; z-index: 1; }

        .top-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }

        .brand { display: flex; align-items: center; gap: 12px; }

        .logo-img { height: 44px; width: auto; object-fit: contain; }
        .logo-initials {
            width: 44px; height: 44px; background: #f3f4f6; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; font-weight: 700; color: #374151; letter-spacing: 1px;
        }

        .workspace-name { font-size: 16px; font-weight: 600; color: #111; }

        .doc-ref { text-align: right; }

        .doc-ref .big-number {
            font-size: 36px; font-weight: 300; color: #e5e7eb;
            letter-spacing: -1px; line-height: 1;
        }

        .doc-ref .doc-label {
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 2px; color: #9ca3af; margin-top: 4px;
        }

        .status-badge {
            display: inline-block; padding: 3px 10px; border-radius: 4px;
            font-size: 10px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.8px; margin-top: 6px;
        }

        .status-draft    { background: #fef3c7; color: #92400e; }
        .status-confirmed { background: #dbeafe; color: #1e40af; }
        .status-shipped  { background: #d1fae5; color: #065f46; }
        .status-cancelled{ background: #fee2e2; color: #991b1b; }
        .status-void     { background: #f3f4f6; color: #6b7280; }

        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; margin-bottom: 40px; }

        .info-block .i-label {
            font-size: 9px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 6px;
        }

        .info-block .i-name { font-size: 14px; font-weight: 600; color: #111; margin-bottom: 3px; }
        .info-block .i-detail { font-size: 12px; color: #6b7280; line-height: 1.6; }

        table.items { width: 100%; border-collapse: collapse; }

        table.items thead th {
            padding: 6px 8px 10px; text-align: left; font-size: 9px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; border-bottom: 1px solid #f3f4f6;
        }

        table.items thead th.num { text-align: right; }

        table.items tbody td {
            padding: 12px 8px; font-size: 13px; color: #374151; vertical-align: top;
            border-bottom: 1px solid #f9fafb;
        }

        table.items tbody td.desc { font-weight: 500; color: #111; }

        table.items tbody td.num { text-align: right; font-variant-numeric: tabular-nums; color: #374151; }

        .totals-wrapper { display: flex; justify-content: flex-end; padding: 0 0 40px; }
        .totals-inner { width: 240px; }

        .t-row {
            display: flex; justify-content: space-between; padding: 7px 0;
            font-size: 13px; color: #6b7280; border-bottom: 1px solid #f9fafb;
        }

        .t-row.final {
            border-top: 1px solid #e5e7eb; border-bottom: none; font-size: 16px;
            font-weight: 700; color: #111; padding-top: 12px; margin-top: 4px;
        }

        .t-row .tv { font-variant-numeric: tabular-nums; }

        .notes-section { padding: 0 48px 36px; }

        .notes-label {
            font-size: 9px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 6px;
        }

        .notes-text { font-size: 12px; color: #6b7280; line-height: 1.7; }

        .footer { padding: 14px 48px; display: flex; justify-content: space-between; font-size: 10px; color: #d1d5db; }
    </style>
</head>
<body>

    <div class="page">

        <div class="top-row">
            <div class="brand">
                @if(!empty($workspace->logo_url))
                    <img class="logo-img" src="{{ $workspace->logo_url }}" alt="{{ $workspace->name }}">
                @else
                    <div class="logo-initials">{{ strtoupper(substr($workspace->name, 0, 2)) }}</div>
                @endif
                <span class="workspace-name">{{ $workspace->name }}</span>
            </div>
            <div class="doc-ref">
                <div class="big-number">{{ $document->number }}</div>
                <div class="doc-label">Sales Order</div>
                @php $statusClass = 'status-' . ($document->status ?? 'draft'); @endphp
                <div><span class="status-badge {{ $statusClass }}">{{ ucfirst($document->status ?? 'draft') }}</span></div>
            </div>
        </div>

        @php $wsSettings = $workspace->settings ?? []; @endphp
        <div class="info-grid">
            <div class="info-block">
                <div class="i-label">From</div>
                <div class="i-name">{{ $workspace->name }}</div>
                @if(!empty($wsSettings['address']))
                    <div class="i-detail">{{ $wsSettings['address'] }}</div>
                @endif
                @if(!empty($wsSettings['vat_number']))
                    <div class="i-detail">VAT {{ $wsSettings['vat_number'] }}</div>
                @endif
            </div>
            <div class="info-block">
                <div class="i-label">Customer</div>
                <div class="i-name">{{ $entity->name ?? 'N/A' }}</div>
                @if(!empty($entity->email))
                    <div class="i-detail">{{ $entity->email }}</div>
                @endif
                @if(!empty($entity->address))
                    <div class="i-detail">{{ $entity->address }}</div>
                @endif
            </div>
            <div class="info-block">
                <div class="i-label">Details</div>
                <div class="i-detail">
                    Ordered: {{ \Carbon\Carbon::parse($document->issue_date)->format('d M Y') }}<br>
                    Delivery: {{ !empty($document->delivery_date) ? \Carbon\Carbon::parse($document->delivery_date)->format('d M Y') : 'TBD' }}<br>
                    @if(!empty($document->currency))Currency: {{ $document->currency }}@endif
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
                    <td class="desc">{{ $item->description }}</td>
                    <td class="num">{{ $item->quantity }}</td>
                    <td class="num">{{ number_format($item->unit_price, 2) }}</td>
                    <td class="num">{{ number_format($item->total, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

    </div>

    <div class="totals-wrapper" style="padding: 0 48px 0;">
        <div class="totals-inner">
            <div class="t-row">
                <span>Subtotal</span>
                <span class="tv">{{ number_format($document->subtotal, 2) }}</span>
            </div>
            @if(!empty($document->tax_total) && $document->tax_total > 0)
            <div class="t-row">
                <span>Tax</span>
                <span class="tv">{{ number_format($document->tax_total, 2) }}</span>
            </div>
            @endif
            @if(!empty($document->discount_total) && $document->discount_total > 0)
            <div class="t-row">
                <span>Discount</span>
                <span class="tv">- {{ number_format($document->discount_total, 2) }}</span>
            </div>
            @endif
            <div class="t-row final">
                <span>Total</span>
                <span class="tv">{{ number_format($document->total, 2) }}</span>
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
    <div class="notes-section" style="padding-top: 12px;">
        <div class="notes-label">Payment Details</div>
        <div class="notes-text">{{ $wsSettings['bank_details'] }}</div>
    </div>
    @endif

    <div class="footer">
        <span>{{ $workspace->name }}</span>
        <span>Page 1 of 1</span>
    </div>

</body>
</html>
