<?php

namespace App\Services;

use App\Core\Models\Alert;
use App\Core\Models\User;
use App\Core\Jobs\SendNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AlertService
{
    private const PUSH_FAILURE_THRESHOLD = 0.2;

    private array $pushResults = [];

    public function create(
        string $workspaceId,
        string $userId,
        string $type,
        string $severity,
        string $title,
        ?string $message = null,
        ?string $assignedTo = null,
    ): Alert {
        if ($assignedTo === null) {
            $assignedTo = $this->resolveSupervisor($workspaceId, $userId);
        }

        $alert = Alert::create([
            'workspace_id' => $workspaceId,
            'user_id' => $userId,
            'assigned_to' => $assignedTo,
            'type' => $type,
            'severity' => $severity,
            'title' => $title,
            'message' => $message,
        ]);

        $this->sendPushNotification($alert);

        return $alert;
    }

    public function sendExpoPush(string $expoPushToken, string $title, string $body): bool
    {
        try {
            $response = Http::post('https://exp.host/--/api/v2/push/send', [
                'to' => $expoPushToken,
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'priority' => 'high',
            ]);

            $data = $response->json();
            $delivered = $response->successful()
                && ($data['data']['status'] ?? 'error') !== 'error';

            $this->pushResults[] = $delivered;

            if (!$delivered) {
                Log::warning('Expo push failed', [
                    'token' => substr($expoPushToken, 0, 10).'...',
                    'response' => $data,
                ]);
            }

            return $delivered;
        } catch (\Exception $e) {
            $this->pushResults[] = false;
            Log::error('Expo push exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function sendSmsFallback(string $phoneNumber, string $message): bool
    {
        try {
            $accountSid = config('services.twilio.account_sid');
            $authToken = config('services.twilio.auth_token');
            $fromNumber = config('services.twilio.from_number');

            if (!$accountSid || !$authToken || !$fromNumber) {
                Log::warning('SMS fallback unavailable: Twilio not configured');
                return false;
            }

            $response = Http::withBasicAuth($accountSid, $authToken)
                ->asForm()
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json", [
                    'From' => $fromNumber,
                    'To' => $phoneNumber,
                    'Body' => $message,
                ]);

            $success = $response->successful();

            if (!$success) {
                Log::error('SMS fallback failed', ['response' => $response->body()]);
            }

            return $success;
        } catch (\Exception $e) {
            Log::error('SMS fallback exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function sendCriticalAlertSms(
        string $workspaceId,
        string $userId,
        string $title,
        string $message,
    ): void {
        $user = User::find($userId);
        $phone = $user?->phone;

        if (!$phone) {
            Log::warning('Critical alert SMS skipped: no phone number', ['user_id' => $userId]);
            return;
        }

        $smsMessage = "[ALERT] {$title}\n{$message}\n\nAquerii HSSE";
        $this->sendSmsFallback($phone, $smsMessage);
    }

    private function sendPushNotification(Alert $alert): void
    {
        // Dispatch in-app notification via the existing job (queued, uses Redis)
        SendNotification::dispatchIf(
            config('queue.default') !== 'sync',
            $alert->workspace_id,
            $alert->user_id,
            "alert.{$alert->type}",
            $alert->title,
            $alert->message,
            'alert',
            $alert->id,
        );

        // Try Expo push for mobile devices if user has a push token
        $user = User::find($alert->user_id);
        $pushToken = $user?->expo_push_token;

        if ($pushToken) {
            $this->sendExpoPush($pushToken, $alert->title, $alert->message ?? $alert->title);
        }

        // Check push failure rate — escalate if >20% failed
        if ($this->shouldEscalateToHsse()) {
            $this->escalateToHsseManager($alert);
        }
    }

    private function shouldEscalateToHsse(): bool
    {
        $total = count($this->pushResults);
        if ($total < 5) {
            return false;
        }

        $failures = count(array_filter($this->pushResults, fn ($r) => !$r));
        return ($failures / $total) > self::PUSH_FAILURE_THRESHOLD;
    }

    private function escalateToHsseManager(Alert $alert): void
    {
        // Find HSSE manager for this workspace
        $hsseManager = DB::table('workspace_members')
            ->join('users', 'users.id', '=', 'workspace_members.user_id')
            ->where('workspace_members.workspace_id', $alert->workspace_id)
            ->where('workspace_members.role', 'hsse_manager')
            ->select('users.id', 'users.phone', 'users.email')
            ->first();

        if ($hsseManager) {
            $smsMsg = "[HSSE ESCALATION] Push notification failure rate exceeded 20%. "
                ."Alert {$alert->id}: {$alert->title}. "
                ."Please investigate immediately.";

            $this->sendSmsFallback($hsseManager->phone, $smsMsg);
        }

        Log::critical('Push notification failure threshold exceeded', [
            'workspace_id' => $alert->workspace_id,
            'alert_id' => $alert->id,
        ]);
    }

    private function resolveSupervisor(string $workspaceId, string $userId): ?string
    {
        $member = DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $userId)
            ->first();

        if ($member === null || $member->reports_to === null) {
            return null;
        }

        $supervisor = DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('id', $member->reports_to)
            ->first();

        return $supervisor?->user_id;
    }
}
