@extends('emails.layout')

@section('body')
<h2 style="margin:0 0 16px; font-size:20px; font-weight:700; color:#111;">
    @if ($eventType === 'subscription_created')
        Welcome to {{ $workspaceName }}!
    @elseif ($eventType === 'payment_succeeded')
        Payment received — thank you
    @elseif ($eventType === 'subscription_cancelled')
        Your subscription has been cancelled
    @else
        Aquerii billing update
    @endif
</h2>

@if ($planName)
<p style="margin:0 0 8px; color:#444; line-height:1.6;">
    <strong>Plan:</strong> {{ $planName }}
</p>
@endif

@if ($amount)
<p style="margin:0 0 8px; color:#444; line-height:1.6;">
    <strong>Amount:</strong> {{ $amount }}
</p>
@endif

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

<p style="margin:0; font-size:12px; color:#aaa; line-height:1.6;">
    If you have questions about your billing, visit your workspace settings or contact our support team.
</p>
@endsection
