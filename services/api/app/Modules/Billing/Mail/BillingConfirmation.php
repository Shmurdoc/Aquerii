<?php

namespace App\Modules\Billing\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Billing confirmation email sent after subscription events.
 * eventType: subscription_created | payment_succeeded | subscription_cancelled
 */
class BillingConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public string $subjectLine;

    public function __construct(
        public readonly string $eventType,
        public readonly array $details,
        public readonly ?string $logoUrl = null,
        public readonly string $brandColor = '#7c3aed',
    ) {
        $this->subjectLine = match ($eventType) {
            'subscription_created' => 'Your Aquerii subscription is active',
            'payment_succeeded' => 'Payment received — thank you',
            'subscription_cancelled' => 'Your Aquerii subscription has been cancelled',
            default => 'Aquerii billing update',
        };
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.billing-confirmation');
    }
}
