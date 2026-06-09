<?php

namespace App\Core\Auth;

use App\Models\GateKiosk;
use Illuminate\Auth\GuardHelpers;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Http\Request;

class GateKioskGuard implements Guard
{
    use GuardHelpers;

    protected Request $request;

    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    public function user(): ?GateKiosk
    {
        if ($this->user !== null) {
            return $this->user;
        }

        $apiKey = $this->request->header('X-API-Key');

        if (! $apiKey) {
            return null;
        }

        $hashedKey = hash('sha256', $apiKey);

        $kiosk = GateKiosk::where('api_key', $hashedKey)->first();

        if (! $kiosk) {
            return null;
        }

        $kiosk->last_used_at = now();
        $kiosk->save();

        return $this->user = $kiosk;
    }

    public function validate(array $credentials = []): bool
    {
        return false;
    }
}
