<?php

namespace App\Core\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent when a user is invited to a workspace.
 * If the invited email has no account, the invite link routes them
 * to /register?invite_token={token} to register and auto-join.
 * If they already have an account, the link routes to /accept-invite/{token}.
 */
class WorkspaceInvitation extends Mailable
{
    use Queueable, SerializesModels;

    public string $acceptUrl;

    /** Alias used in the blade view (matches the variable name $inviteUrl). */
    public string $inviteUrl;

    public function __construct(
        public readonly string $workspaceName,
        public readonly string $inviterName,
        public readonly string $inviteToken,
        public readonly string $invitedEmail,
        public readonly bool $userExists,
        public readonly ?string $logoUrl = null,
        public readonly string $brandColor = '#7c3aed',
    ) {
        $base = rtrim(config('app.frontend_url'), '/');

        $this->acceptUrl = $userExists
            ? "{$base}/accept-invite/{$inviteToken}"
            : "{$base}/register?invite_token={$inviteToken}&email=".urlencode($invitedEmail);

        $this->inviteUrl = $this->acceptUrl;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->inviterName} invited you to {$this->workspaceName} on Aquerii",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.workspace-invitation',
        );
    }
}
