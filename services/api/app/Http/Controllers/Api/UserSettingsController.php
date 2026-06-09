<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserSettingsController extends Controller
{
    // POST /user/two-factor-authentication
    public function enableTwoFactor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        $user = $request->user();
        $secret = $user->two_factor_secret ?? $this->generateSecret();

        if (! $this->verifyCode($secret, $validated['code'])) {
            return response()->json(['message' => 'Invalid code.'], 422);
        }

        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_enabled' => true,
        ]);

        return response()->json(['message' => 'Two-factor authentication enabled.']);
    }

    // POST /user/confirmed-two-factor-authentication
    public function confirmTwoFactor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        $user = $request->user();

        if (! $this->verifyCode($user->two_factor_secret, $validated['code'])) {
            return response()->json(['message' => 'Invalid code.'], 422);
        }

        $user->update(['two_factor_enabled' => true]);

        return response()->json(['message' => 'Two-factor authentication confirmed.']);
    }

    // DELETE /user/two-factor-authentication
    public function disableTwoFactor(Request $request): JsonResponse
    {
        $request->user()->update([
            'two_factor_secret' => null,
            'two_factor_enabled' => false,
        ]);

        return response()->json(['message' => 'Two-factor authentication disabled.']);
    }

    // GET /user/two-factor-qr-code
    public function getTwoFactorQrCode(Request $request): JsonResponse
    {
        $user = $request->user();
        $secret = $user->two_factor_secret ?? $this->generateSecret();

        $totpUrl = sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&digits=6&period=30',
            urlencode('Aquerii'),
            urlencode($user->email),
            $secret,
            urlencode('Aquerii')
        );

        $svg = $this->generateQrCodeSvg($totpUrl);

        return response()->json(['data' => ['svg' => $svg, 'secret' => $secret]]);
    }

    // GET /user/two-factor-recovery-codes
    public function getTwoFactorRecoveryCodes(Request $request): JsonResponse
    {
        $codes = $request->user()->two_factor_recovery_codes ?? [];

        return response()->json(['data' => $codes]);
    }

    // GET /user/sessions
    public function getSessions(Request $request): JsonResponse
    {
        $sessions = $request->user()->sessions()
            ->orderBy('last_activity_at', 'desc')
            ->get()
            ->map(fn ($session) => [
                'id' => $session->id,
                'ip_address' => $session->ip_address,
                'user_agent' => $session->user_agent,
                'last_activity_at' => $session->last_activity_at,
            ]);

        return response()->json(['data' => $sessions]);
    }

    // DELETE /user/sessions/{sessionId}
    public function revokeSession(Request $request, string $sessionId): JsonResponse
    {
        $deleted = $request->user()->sessions()
            ->where('id', $sessionId)
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        return response()->json(['message' => 'Session revoked.']);
    }

    // GET /user/notifications/preferences
    public function getNotificationPreferences(Request $request): JsonResponse
    {
        $prefs = $request->user()->notification_preferences ?? [
            'email_notifications' => true,
            'push_notifications' => true,
            'mention_notifications' => true,
            'task_assignments' => true,
            'due_date_reminders' => true,
        ];

        return response()->json(['data' => $prefs]);
    }

    // PUT /me/notification-preferences
    public function updateNotificationPreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_invoice_sent' => 'sometimes|boolean',
            'email_invoice_received' => 'sometimes|boolean',
            'email_invoice_paid' => 'sometimes|boolean',
            'email_leave_submitted' => 'sometimes|boolean',
            'email_leave_approved' => 'sometimes|boolean',
            'email_leave_declined' => 'sometimes|boolean',
            'email_expense_approved' => 'sometimes|boolean',
            'email_expense_declined' => 'sometimes|boolean',
            'email_meeting_invitation' => 'sometimes|boolean',
            'email_member_joined' => 'sometimes|boolean',
            'email_member_left' => 'sometimes|boolean',
        ]);

        $request->user()->update(['notification_preferences' => $validated]);

        return response()->json(['data' => $request->user()->notification_preferences]);
    }

    // POST /user/password
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->update(['password' => Hash::make($validated['new_password'])]);

        return response()->json(['message' => 'Password changed.']);
    }

    private function generateSecret(): string
    {
        return rtrim(str_replace(['+', '/', '='], ['', '', ''], base64_encode(random_bytes(32))), '=');
    }

    private function verifyCode(string $secret, string $code): bool
    {
        $time = floor(time() / 30);

        for ($i = -1; $i <= 1; $i++) {
            $counter = $time + $i;
            $calculated = $this->generateCode($secret, $counter);
            if (hash_equals($calculated, $code)) {
                return true;
            }
        }

        return false;
    }

    private function generateCode(string $secret, int $counter): string
    {
        $binary = pack('N*', 0).pack('N*', $counter);
        $binary = str_pad($binary, 8, chr(0), STR_PAD_LEFT);

        $hmac = hash_hmac('sha1', $binary, $secret, true);
        $offset = ord(substr($hmac, -1)) & 0x0F;
        $code = (
            ((ord($hmac[$offset]) & 0x7F) << 24) |
            ((ord($hmac[$offset + 1]) & 0xFF) << 16) |
            ((ord($hmac[$offset + 2]) & 0xFF) << 8) |
            (ord($hmac[$offset + 3]) & 0xFF)
        ) % 1000000;

        return str_pad((string) $code, 6, '0', STR_PAD_LEFT);
    }

    private function generateQrCodeSvg(string $data): string
    {
        $encoded = rawurlencode($data);

        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><text x="128" y="128" text-anchor="middle" font-size="12">QR Code</text></svg>';
    }
}
