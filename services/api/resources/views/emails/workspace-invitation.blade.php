@extends('emails.layout')

@section('body')
<h2 style="margin:0 0 16px; font-size:20px; font-weight:700; color:#111;">
    You've been invited to join {{ $workspaceName }}
</h2>
<p style="margin:0 0 12px; color:#444; line-height:1.6;">
    <strong>{{ $inviterName }}</strong> has invited you to collaborate on <strong>{{ $workspaceName }}</strong>.
</p>
<p style="margin:0 0 28px; color:#444; line-height:1.6;">
    Click the button below to {{ $userExists ? 'accept your invitation' : 'create your account and accept the invitation' }}.
</p>
<a href="{{ $inviteUrl }}" style="display:inline-block; padding:12px 28px; border-radius:8px; background:{{ $brandColor }}; color:#fff; text-decoration:none; font-weight:600; font-size:14px;">
    Accept Invitation
</a>
<p style="margin:28px 0 0; font-size:12px; color:#aaa; line-height:1.6;">
    This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
</p>
@endsection
