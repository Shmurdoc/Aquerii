<?php

namespace App\Modules\Email\Mail;

use Illuminate\Mail\Mailable;

class RawEmail extends Mailable
{
    public function __construct(
        private string $htmlBody,
        private string $emailSubject,
        private string $fromAddress,
    ) {}

    public function build(): static
    {
        return $this
            ->from($this->fromAddress)
            ->subject($this->emailSubject)
            ->html($this->htmlBody);
    }
}
