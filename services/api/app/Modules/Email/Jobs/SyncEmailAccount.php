<?php

namespace App\Modules\Email\Jobs;

use App\Modules\Email\Models\EmailAccount;
use App\Modules\Email\Models\Email;
use App\Modules\Email\Models\EmailThread;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncEmailAccount implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 300;

    public function __construct(public EmailAccount $account) {}

    public function handle(): void
    {
        try {
            if (!class_exists(\Webklex\PHPIMAP\ClientManager::class)) {
                Log::warning('webklex/php-imap not installed; skipping email sync.');
                return;
            }

            $cm = new \Webklex\PHPIMAP\ClientManager([]);
            $client = $cm->make([
                'host'          => $this->account->imap_host,
                'port'          => $this->account->imap_port,
                'encryption'    => $this->account->imap_ssl ? 'ssl' : false,
                'validate_cert' => false,
                'username'      => $this->account->imap_username,
                'password'      => $this->account->getImapPasswordDecrypted(),
                'protocol'      => 'imap',
            ]);

            $client->connect();
            $inbox = $client->getFolder('INBOX');
            $messages = $inbox->messages()->since(
                $this->account->last_synced_at ?? now()->subDays(7)
            )->get();

            foreach ($messages as $msg) {
                $externalId = (string) $msg->getMessageId();
                if (Email::where('external_message_id', $externalId)->exists()) {
                    continue;
                }

                $subject    = (string) $msg->getSubject();
                $threadRef  = (string) ($msg->getReferences() ?? $msg->getInReplyTo() ?? $externalId);

                // Find or create thread
                $thread = EmailThread::firstOrCreate(
                    ['external_thread_id' => $threadRef, 'email_account_id' => $this->account->id],
                    [
                        'workspace_id'    => $this->account->workspace_id,
                        'subject'         => $subject,
                        'status'          => 'unread',
                        'last_message_at' => $msg->getDate()->toDate(),
                        'message_count'   => 0,
                    ]
                );

                $from = $msg->getFrom()[0] ?? null;

                Email::create([
                    'workspace_id'       => $this->account->workspace_id,
                    'email_account_id'   => $this->account->id,
                    'thread_id'          => $thread->id,
                    'external_message_id'=> $externalId,
                    'direction'          => 'inbound',
                    'from_address'       => $from?->mail ?? '',
                    'from_name'          => $from?->personal ?? null,
                    'to_addresses'       => collect($msg->getTo())->pluck('mail')->toArray(),
                    'cc_addresses'       => collect($msg->getCc() ?? [])->pluck('mail')->toArray(),
                    'bcc_addresses'      => [],
                    'subject'            => $subject,
                    'body_html'          => $msg->getHTMLBody() ?: null,
                    'body_text'          => $msg->getTextBody() ?: null,
                    'is_read'            => false,
                    'received_at'        => $msg->getDate()->toDate(),
                ]);

                $thread->increment('message_count');
                $thread->update(['last_message_at' => $msg->getDate()->toDate()]);
            }

            $this->account->update([
                'last_synced_at' => now(),
                'status'         => 'active',
                'last_error'     => null,
            ]);

        } catch (\Throwable $e) {
            $this->account->update(['status' => 'error', 'last_error' => $e->getMessage()]);
            Log::error('Email sync failed', ['account' => $this->account->id, 'error' => $e->getMessage()]);
            throw $e;
        }
    }
}
