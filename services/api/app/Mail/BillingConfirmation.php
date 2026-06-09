<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BillingConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  string  $eventType  e.g. 'subscription.created', 'subscription.cancelled', 'payment.succeeded'
     * @param  array  $details  Arbitrary key/value pairs shown in the email body
     */
    public function __construct(
        public readonly string $eventType,
        public readonly array $details = [],
    ) {}

    public function envelope(): Envelope
    {
        $subject = match ($this->eventType) {
            'subscription.created' => 'Welcome to Aquerii — subscription confirmed',
            'subscription.cancelled' => 'Your Aquerii subscription has been cancelled',
            'payment.succeeded' => 'Payment received — thank you',
            'payment.failed' => 'Action required: payment failed',
            default => 'Aquerii billing update',
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        $workspaceName = $this->details['workspace_name'] ?? $this->details['workspace'] ?? 'Your Workspace';
        $planName = $this->details['plan_name'] ?? $this->details['plan'] ?? '';
        $amount = $this->details['amount'] ?? $this->details['total'] ?? '';

        return new Content(
            view: 'emails.billing-confirmation',
            with: [
                'workspaceName' => $workspaceName,
                'planName' => $planName,
                'amount' => $amount,
                'eventType' => str_replace('.', '_', $this->eventType),
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
