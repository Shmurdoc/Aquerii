<?php

use App\Modules\Email\Jobs\SyncAllEmailAccounts;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Reset monthly AI credits at the start of each month
Schedule::command('app:reset-ai-credits')->monthlyOn(1, '00:00');

// Send due-date reminders for items due in the next 24 hours
Schedule::command('app:send-due-reminders')->hourly();

// Revoke expired Sanctum tokens daily
Schedule::command('sanctum:prune-expired')->daily();

// Sync all email accounts every 5 minutes
Schedule::job(new SyncAllEmailAccounts)->everyFiveMinutes();

// Alert stale contacts daily
Schedule::command('crm:alert-stale-contacts')->daily();

// Check deal approval escalations
Schedule::command('crm:check-deal-escalations')->everyFiveMinutes();

// Check aging deals for automation triggers
Schedule::command('crm:check-deal-aging')->hourly();
