<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ $eventType }}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 40px 0; }
    .card { background: #ffffff; max-width: 520px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #4f46e5; padding: 32px 40px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .body { padding: 32px 40px; color: #374151; font-size: 15px; line-height: 1.6; }
    .details { background: #f9fafb; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .details table { width: 100%; border-collapse: collapse; }
    .details td { padding: 6px 0; font-size: 14px; }
    .details td:first-child { color: #6b7280; width: 40%; }
    .details td:last-child { color: #111827; font-weight: 500; }
    .footer { padding: 20px 40px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
    a { color: #4f46e5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Aquerii</h1>
    </div>
    <div class="body">
      <p>Hi there,</p>
      @switch($eventType)
        @case('subscription.created')
          <p>Your Aquerii subscription is now active. Welcome aboard!</p>
          @break
        @case('subscription.cancelled')
          <p>Your subscription has been cancelled. You'll retain access until the end of your current billing period.</p>
          @break
        @case('payment.succeeded')
          <p>We've received your payment successfully. Thank you!</p>
          @break
        @case('payment.failed')
          <p><strong>We were unable to process your payment.</strong> Please update your payment method to keep your account active.</p>
          @break
        @default
          <p>There's been an update to your Aquerii billing.</p>
      @endswitch

      @if(count($details) > 0)
      <div class="details">
        <table>
          @foreach($details as $key => $value)
          <tr>
            <td>{{ ucwords(str_replace('_', ' ', $key)) }}</td>
            <td>{{ $value }}</td>
          </tr>
          @endforeach
        </table>
      </div>
      @endif

      <p>If you have any questions, reply to this email and we'll be happy to help.</p>
      <p>— The Aquerii team</p>
    </div>
    <div class="footer">
      Aquerii &bull; <a href="{{ config('app.url') }}">{{ config('app.url') }}</a>
    </div>
  </div>
</body>
</html>
