<?php

namespace App\Jobs;

use App\Models\Workspace;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Stripe\StripeClient;

class SyncStripeSubscriptionQuantity implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;
    public int $backoff = 30;

    public function __construct(public readonly string $workspaceId) {}

    public function handle(): void
    {
        $workspace = Workspace::find($this->workspaceId);
        if (!$workspace || !$workspace->stripe_subscription_id) return;

        $stripe      = new StripeClient(config('services.stripe.secret'));
        $memberCount = \App\Models\WorkspaceMember::where('workspace_id', $this->workspaceId)->count();

        $stripe->subscriptions->update($workspace->stripe_subscription_id, [
            'items' => [['id' => $workspace->stripe_subscription_item_id, 'quantity' => max(1, $memberCount)]],
        ]);
    }
}
