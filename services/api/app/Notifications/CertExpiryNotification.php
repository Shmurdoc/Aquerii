<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CertExpiryNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $workerName,
        public readonly string $certType,
        public readonly string $certName,
        public readonly int $daysRemaining,
        public readonly string $recordType,
        public readonly string $recordId,
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['mail'];

        if ($this->daysRemaining <= 7) {
            $channels[] = 'sms';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subject = $this->buildSubject();
        $body = $this->buildBody();

        return (new MailMessage)
            ->subject($subject)
            ->line($body)
            ->line("Worker: {$this->workerName}")
            ->line("Certificate: {$this->certName} ({$this->certType})")
            ->line("Days remaining: {$this->daysRemaining}")
            ->action('View Compliance Dashboard', url('/compliance'));
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'worker_name' => $this->workerName,
            'cert_type' => $this->certType,
            'cert_name' => $this->certName,
            'days_remaining' => $this->daysRemaining,
            'record_type' => $this->recordType,
            'record_id' => $this->recordId,
            'subject' => $this->buildSubject(),
            'body' => $this->buildBody(),
        ];
    }

    public function toSms(object $notifiable): string
    {
        $days = $this->daysRemaining > 0
            ? "{$this->daysRemaining} days remaining"
            : 'EXPIRED TODAY';

        return "[Aquerii] {$this->workerName}'s {$this->certName} ({$this->certType}) - {$days}. Please review compliance.";
    }

    private function buildSubject(): string
    {
        return match (true) {
            $this->daysRemaining <= 0 => "EXPIRED: {$this->workerName}'s {$this->certName} has expired",
            $this->daysRemaining <= 7 => "URGENT: {$this->workerName}'s {$this->certName} expires in {$this->daysRemaining} days",
            $this->daysRemaining <= 30 => "WARNING: {$this->workerName}'s {$this->certName} expires in {$this->daysRemaining} days",
            default => "NOTICE: {$this->workerName}'s {$this->certName} expires in {$this->daysRemaining} days",
        };
    }

    private function buildBody(): string
    {
        return match (true) {
            $this->daysRemaining <= 0 => "{$this->workerName}'s {$this->certName} ({$this->certType}) has expired. The worker's compliance status has been set to non-compliant. Immediate action required.",
            $this->daysRemaining <= 7 => "{$this->workerName}'s {$this->certName} ({$this->certType}) will expire in {$this->daysRemaining} days. Urgent renewal required to avoid automatic non-compliance flagging.",
            $this->daysRemaining <= 30 => "{$this->workerName}'s {$this->certName} ({$this->certType}) will expire in {$this->daysRemaining} days. Please arrange renewal.",
            default => "{$this->workerName}'s {$this->certName} ({$this->certType}) will expire in {$this->daysRemaining} days. Please plan for renewal.",
        };
    }

    public function viaType(): string
    {
        return 'cert_expiry';
    }
}
