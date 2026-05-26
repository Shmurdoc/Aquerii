<?php

namespace App\Modules\Email\Jobs;

use App\Modules\Email\Models\EmailAccount;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncAllEmailAccounts implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        EmailAccount::where('status', '!=', 'paused')->each(function (EmailAccount $account) {
            dispatch(new SyncEmailAccount($account))->onQueue('default');
        });
    }
}
