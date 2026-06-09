<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class VisitorArrivedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $visitorName,
        public readonly string $visitorCompany,
        public readonly string $visitorType,
        public readonly string $hostName,
        public readonly string $signedInAt,
    ) {}

    public function via(object $notifiable): array
    {
        return ['sms'];
    }

    public function toSms(object $notifiable): string
    {
        $type = ucfirst(str_replace('_', ' ', $this->visitorType));

        return "[Aquerii] VISITOR ARRIVED: {$this->visitorName} ({$this->visitorCompany}, {$type}) has arrived for {$this->hostName} at {$this->signedInAt}.";
    }
}
