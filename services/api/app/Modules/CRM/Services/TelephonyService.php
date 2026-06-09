<?php

namespace App\Modules\CRM\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelephonyService
{
    protected ?string $accountSid;

    protected ?string $authToken;

    protected ?string $fromNumber;

    public function __construct()
    {
        $this->accountSid = config('services.twilio.account_sid');
        $this->authToken = config('services.twilio.auth_token');
        $this->fromNumber = config('services.twilio.from_number');
    }

    public function isConfigured(): bool
    {
        return ! empty($this->accountSid) && ! empty($this->authToken) && ! empty($this->fromNumber);
    }

    public function initiateCall(string $toNumber, ?string $callerName = null): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'error' => 'Twilio not configured'];
        }

        $statusCallback = config('services.twilio.status_callback', url('/api/webhooks/twilio/call-status'));

        try {
            $response = Http::withBasicAuth($this->accountSid, $this->authToken)
                ->asForm()
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$this->accountSid}/Calls.json", [
                    'To' => $toNumber,
                    'From' => $this->fromNumber,
                    'Url' => config('services.twilio.twiml_url', url('/api/webhooks/twilio/twiml')),
                    'StatusCallback' => $statusCallback,
                    'Timeout' => 30,
                ]);

            if (! $response->successful()) {
                Log::error('Twilio call failed', ['response' => $response->body()]);

                return ['success' => false, 'error' => 'Twilio API error'];
            }

            $data = $response->json();

            return [
                'success' => true,
                'call_sid' => $data['sid'] ?? null,
                'status' => $data['status'] ?? 'queued',
                'direction' => 'outbound',
            ];
        } catch (\Throwable $e) {
            Log::error('TelephonyService initiateCall exception', ['error' => $e->getMessage()]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function sendSms(string $toNumber, string $message): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'error' => 'Twilio not configured'];
        }

        try {
            $response = Http::withBasicAuth($this->accountSid, $this->authToken)
                ->asForm()
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$this->accountSid}/Messages.json", [
                    'To' => $toNumber,
                    'From' => $this->fromNumber,
                    'Body' => $message,
                ]);

            if (! $response->successful()) {
                return ['success' => false, 'error' => 'SMS send failed'];
            }

            return ['success' => true, 'sid' => $response->json('sid')];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getCallStatus(string $callSid): array
    {
        if (! $this->isConfigured()) {
            return ['error' => 'Not configured'];
        }

        $response = Http::withBasicAuth($this->accountSid, $this->authToken)
            ->get("https://api.twilio.com/2010-04-01/Accounts/{$this->accountSid}/Calls/{$callSid}.json");

        if (! $response->successful()) {
            return ['error' => 'API error'];
        }

        return $response->json();
    }
}
