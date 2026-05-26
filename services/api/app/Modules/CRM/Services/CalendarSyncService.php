<?php

namespace App\Modules\CRM\Services;

use App\Core\Models\OAuthAccount;
use App\Modules\CRM\Models\CrmCalendarSync;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CalendarSyncService
{
    public function syncEvents(CrmCalendarSync $sync, int $daysBack = 7, int $daysForward = 30): array
    {
        $account = OAuthAccount::where('user_id', $sync->user_id)
            ->where('provider', $sync->provider)
            ->first();

        if (!$account || !$account->access_token) {
            return ['success' => false, 'error' => 'No OAuth account linked'];
        }

        $provider = $sync->provider;
        $events = [];

        try {
            $events = match ($provider) {
                'google'   => $this->fetchGoogleEvents($account, $sync->calendar_id, $daysBack, $daysForward),
                'microsoft' => $this->fetchOutlookEvents($account, $sync->calendar_id, $daysBack, $daysForward),
                default    => [],
            };

            $sync->update(['last_synced_at' => Carbon::now()]);

            return ['success' => true, 'events' => $events, 'count' => count($events)];
        } catch (\Throwable $e) {
            Log::error('CalendarSync failed', [
                'provider' => $provider,
                'error'    => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function fetchGoogleEvents(OAuthAccount $account, string $calendarId, int $daysBack, int $daysForward): array
    {
        $timeMin = Carbon::now()->subDays($daysBack)->toIso8601String();
        $timeMax = Carbon::now()->addDays($daysForward)->toIso8601String();

        $response = Http::withToken($account->access_token)
            ->get("https://www.googleapis.com/calendar/v3/calendars/{$calendarId}/events", [
                'timeMin'       => $timeMin,
                'timeMax'       => $timeMax,
                'singleEvents'  => 'true',
                'orderBy'       => 'startTime',
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Google Calendar API error: ' . $response->body());
        }

        return $response->json('items', []);
    }

    protected function fetchOutlookEvents(OAuthAccount $account, string $calendarId, int $daysBack, int $daysForward): array
    {
        $timeMin = Carbon::now()->subDays($daysBack)->format('Y-m-d\TH:i:s\Z');
        $timeMax = Carbon::now()->addDays($daysForward)->format('Y-m-d\TH:i:s\Z');

        $response = Http::withToken($account->access_token)
            ->get("https://graph.microsoft.com/v1.0/me/calendars/{$calendarId}/events", [
                '\$filter' => "start/dateTime ge '{$timeMin}' and end/dateTime le '{$timeMax}'",
                '\$orderby' => 'start/dateTime',
                '\$top'     => 50,
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Outlook Graph API error: ' . $response->body());
        }

        return $response->json('value', []);
    }

    public function getCalendars(OAuthAccount $account, string $provider): array
    {
        try {
            return match ($provider) {
                'google'   => $this->listGoogleCalendars($account),
                'microsoft' => $this->listOutlookCalendars($account),
                default    => [],
            };
        } catch (\Throwable $e) {
            Log::error('CalendarSync list failed', ['provider' => $provider, 'error' => $e->getMessage()]);
            return [];
        }
    }

    protected function listGoogleCalendars(OAuthAccount $account): array
    {
        $response = Http::withToken($account->access_token)
            ->get('https://www.googleapis.com/calendar/v3/users/me/calendarList');

        if (!$response->successful()) return [];

        return array_map(fn($c) => [
            'id'   => $c['id'],
            'name' => $c['summary'] ?? $c['id'],
        ], $response->json('items', []));
    }

    protected function listOutlookCalendars(OAuthAccount $account): array
    {
        $response = Http::withToken($account->access_token)
            ->get('https://graph.microsoft.com/v1.0/me/calendars');

        if (!$response->successful()) return [];

        return array_map(fn($c) => [
            'id'   => $c['id'],
            'name' => $c['name'] ?? $c['id'],
        ], $response->json('value', []));
    }
}
