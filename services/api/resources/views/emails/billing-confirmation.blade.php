@extends('emails.layout')

@section('body')
<h2 style="margin:0 0 16px; font-size:20px; font-weight:700; color:#111;">
    {{ $subjectLine }}
</h2>
<p style="margin:0 0 20px; color:#444; line-height:1.6;">
    @if ($eventType === 'subscription_created')
        Your subscription is now active. You have full access to all features in your plan.
    @elseif ($eventType === 'payment_succeeded')
        We've received your payment. Thank you for being a valued customer.
    @elseif ($eventType === 'subscription_cancelled')
        Your subscription has been cancelled. You'll retain access until the end of your current billing period.
    @else
        Please review the details of your recent billing activity below.
    @endif
</p>

@if (!empty($details))
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background-color:#f4f4f5; border-radius:8px; padding:0; margin:0 0 24px;">
    <tr>
        <td style="padding:16px 20px;">
            @foreach ($details as $label => $value)
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="{{ !$loop->last ? 'border-bottom:1px solid #e4e4e7;' : '' }} padding-bottom:{{ !$loop->last ? '10px' : '0' }}; margin-bottom:{{ !$loop->last ? '10px' : '0' }};">
                <tr>
                    <td style="font-size:13px; font-weight:600; color:#18181b; padding-bottom:2px;">
                        {{ ucwords(str_replace('_', ' ', $label)) }}
                    </td>
                </tr>
                <tr>
                    <td style="font-size:14px; color:#52525b;">
                        {{ $value }}
                    </td>
                </tr>
            </table>
            @endforeach
        </td>
    </tr>
</table>
@endif

<p style="margin:0; font-size:12px; color:#aaa; line-height:1.6;">
    If you have questions about your billing, visit your workspace settings or contact our support team.
</p>
@endsection
