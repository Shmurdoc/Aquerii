<x-mail::message>
# You've been invited to {{ $workspaceName }}

**{{ $inviterName }}** has invited you to join **{{ $workspaceName }}** as a **{{ $role }}**.

<x-mail::button :url="$acceptUrl">
Accept Invitation
</x-mail::button>

This invitation expires on **{{ $expiresAt }}**.

If you did not expect this invitation, you can safely ignore this email.

Thanks,
{{ config('app.name') }}
</x-mail::message>
