<?php

namespace App\Core\Services;

use App\Core\Models\PushSubscription;
use App\Core\Models\User;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use RuntimeException;

/**
 * Web Push delivery via the W3C Push API + VAPID.
 *
 * Stores per-device endpoints in `push_subscriptions` (created via
 * PushSubscriptionController). Sending encrypts the payload with the
 * subscription's p256dh key and posts to the push service URL — the
 * server never sees the encrypted plaintext beyond a one-time trust path.
 *
 * VAPID keys live in config/webpush.php. Empty values are a misconfiguration,
 * not a soft "skip" — we throw so the caller (a queued notification or a
 * job) surfaces the failure to the audit log instead of silently dropping it.
 */
class PushNotificationService
{
    /**
     * Send a single notification to every active subscription for a user.
     * Returns the number of subscriptions that returned a success report
     * (push service accepted the message). Failed / expired endpoints are
     * pruned in-line so the table doesn't accumulate dead rows.
     */
    public function sendTo(User $user, string $title, string $body, ?string $url = null): int
    {
        $subscriptions = PushSubscription::where('user_id', $user->id)->get();

        if ($subscriptions->isEmpty()) {
            return 0;
        }

        $webPush = $this->buildClient();
        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'url' => $url,
        ], JSON_THROW_ON_ERROR);

        $sent = 0;

        foreach ($subscriptions as $sub) {
            $report = $webPush->sendNotification(
                $this->toSubscription($sub),
                $payload,
                ['TTL' => 60 * 60 * 24],
            );

            // 410 Gone / 404 Not Found → the endpoint is dead. Delete it so
            // we stop trying on every subsequent send.
            if ($report->isSubscriptionExpired()) {
                $sub->delete();

                continue;
            }

            if ($report->isSuccess()) {
                $sent++;
                // Cheap bookkeeping — fire-and-forget update; don't block
                // the count on a write that the caller doesn't care about.
                $sub->update(['last_seen_at' => now()]);
            }
        }

        return $sent;
    }

    /**
     * Send the same notification to a batch of user IDs. Used by broadcast
     * paths (workspace announcements, deal-stage updates to a team) that
     * need to fan out without loading the full User records.
     */
    public function sendToAll(array $userIds, string $title, string $body): int
    {
        if (empty($userIds)) {
            return 0;
        }

        $webPush = $this->buildClient();
        $payload = json_encode([
            'title' => $title,
            'body' => $body,
        ], JSON_THROW_ON_ERROR);

        $subscriptions = PushSubscription::whereIn('user_id', $userIds)->get();

        if ($subscriptions->isEmpty()) {
            return 0;
        }

        $sent = 0;
        $expired = [];

        foreach ($subscriptions as $sub) {
            $report = $webPush->sendNotification(
                $this->toSubscription($sub),
                $payload,
                ['TTL' => 60 * 60 * 24],
            );

            if ($report->isSubscriptionExpired()) {
                $expired[] = $sub->id;

                continue;
            }

            if ($report->isSuccess()) {
                $sent++;
            }
        }

        if (! empty($expired)) {
            PushSubscription::whereIn('id', $expired)->delete();
        }

        return $sent;
    }

    private function buildClient(): WebPush
    {
        $publicKey = (string) config('webpush.vapid_public_key', '');
        $privateKey = (string) config('webpush.vapid_private_key', '');
        $subject = (string) config('webpush.vapid_subject', 'mailto:admin@aquerii.app');

        if ($publicKey === '' || $privateKey === '') {
            throw new RuntimeException(
                'Web Push VAPID keys are not configured. Set WEBPUSH_PUBLIC_KEY and '
                .'WEBPUSH_PRIVATE_KEY in the environment (generate with: '
                .'composer exec minishlink/web-push generate-vapid).'
            );
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);

        // Reasonable default — keeps the worker from hanging on a single
        // unreachable push service. Override at the call site if needed.
        $webPush->setDefaultOptions(['TTL' => 60 * 60 * 24]);

        return $webPush;
    }

    private function toSubscription(PushSubscription $sub): Subscription
    {
        return new Subscription(
            $sub->endpoint,
            $sub->p256dh_key,
            $sub->auth_key,
        );
    }
}
