<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\WorkspaceMember;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PurgeUserData implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public readonly string $userId) {}

    public function handle(): void
    {
        $user = User::find($this->userId);
        if (!$user) return;

        // Anonymize user data (GDPR erasure)
        $user->update([
            'name'       => 'Deleted User',
            'email'      => "deleted_{$this->userId}@purged.local",
            'avatar_url' => null,
            'deleted_at' => now(),
        ]);

        // Remove workspace memberships
        WorkspaceMember::where('user_id', $this->userId)->delete();

        Log::info("User data purged for user_id={$this->userId}");
    }
}
