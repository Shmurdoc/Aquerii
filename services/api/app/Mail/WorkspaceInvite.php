<?php

namespace App\Mail;

use App\Models\WorkspaceInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WorkspaceInvite extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly WorkspaceInvitation $invitation,
        public readonly string $inviterName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You've been invited to join {$this->invitation->workspace->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.workspace.invite',
            with: [
                'workspaceName' => $this->invitation->workspace->name,
                'inviterName' => $this->inviterName,
                'role' => $this->invitation->role,
                'acceptUrl' => config('app.frontend_url')
                    .'/invitations/'.$this->invitation->token.'/accept',
                'expiresAt' => $this->invitation->expires_at->toFormattedDateString(),
            ],
        );
    }
}
