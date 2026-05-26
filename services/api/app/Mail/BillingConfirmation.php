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
        return new Content(view: 'emails.billing.confirmation');
    }

    public function attachments(): array
    {
        return [];
    }
}
