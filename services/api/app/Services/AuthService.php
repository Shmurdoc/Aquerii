<?php

namespace App\Services;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class AuthService
{
    public function register(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name'          => $data['name'],
                'email'         => $data['email'],
                'password_hash' => Hash::make($data['password']),
            ]);

            $slug      = $this->uniqueSlug($data['workspace_name']);
            $workspace = Workspace::create([
                'name' => $data['workspace_name'],
                'slug' => $slug,
            ]);

            WorkspaceMember::create([
                'workspace_id' => $workspace->id,
                'user_id'      => $user->id,
                'role'         => 'owner',
                'status'       => 'active',
                'joined_at'    => now(),
            ]);

            event(new Registered($user));

            $token = $user->createToken('auth')->plainTextToken;

            return [$user, $workspace, $token];
        });
    }

    public function login(array $data): array|string
    {
        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password_hash)) {
            abort(401, json_encode([
                'error' => ['code' => 'INVALID_CREDENTIALS', 'message' => 'Email or password is incorrect.'],
            ]));
        }

        // MFA flow
        if ($user->two_factor_enabled) {
            if (empty($data['mfa_code'])) {
                // Store a short-lived pending session in cache
                cache()->put("mfa_pending:{$user->id}", true, 300);
                return 'MFA_REQUIRED';
            }

            $g2fa = new Google2FA();
            if (!$g2fa->verifyKey($user->two_factor_secret, $data['mfa_code'])) {
                abort(422, json_encode([
                    'error' => ['code' => 'MFA_INVALID', 'message' => 'Invalid MFA code.'],
                ]));
            }
        }

        $user->update(['last_seen_at' => now()]);
        $token = $user->createToken('auth')->plainTextToken;

        return [$user, $token];
    }

    public function refreshToken(string $token): string
    {
        // Sanctum tokens are long-lived; for SPA use cookie-based auth.
        // For mobile / API clients: revoke old token, issue new one.
        $pat = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
        if (!$pat) {
            abort(401, json_encode(['error' => ['code' => 'TOKEN_INVALID']]));
        }
        $user = $pat->tokenable;
        $pat->delete();
        return $user->createToken('auth')->plainTextToken;
    }

    public function sendPasswordReset(string $email): void
    {
        Password::sendResetLink(['email' => $email]);
    }

    public function resetPassword(array $data): void
    {
        $status = Password::reset(
            ['email' => $data['email'], 'password' => $data['password'], 'token' => $data['token']],
            function (User $user, string $password) {
                $user->update(['password_hash' => Hash::make($password)]);
                $user->tokens()->delete(); // invalidate all sessions
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            abort(422, json_encode(['error' => ['code' => 'RESET_FAILED', 'message' => __($status)]]));
        }
    }

    public function verifyEmail(string $id, string $hash, Request $request): void
    {
        $user = User::findOrFail($id);

        if (!hash_equals(sha1($user->email), $hash)) {
            abort(403, json_encode(['error' => ['code' => 'EMAIL_VERIFY_INVALID']]));
        }

        if (!$user->email_verified_at) {
            $user->update(['email_verified_at' => now()]);
            event(new Verified($user));
        }
    }

    public function enableMfa(User $user): array
    {
        $g2fa     = new Google2FA();
        $secret   = $g2fa->generateSecretKey();
        $qrUrl    = $g2fa->getQRCodeUrl('Aquerii', $user->email, $secret);
        $recovery = collect(range(1, 8))->map(fn() => Str::random(10))->all();

        $user->update([
            'two_factor_secret'         => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode($recovery)),
            'two_factor_enabled'        => true,
        ]);

        return [$secret, $qrUrl, $recovery];
    }

    public function verifyMfaCode(User $user, string $code): bool
    {
        $g2fa  = new Google2FA();
        $secret = decrypt($user->two_factor_secret);
        return (bool) $g2fa->verifyKey($secret, $code);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i    = 1;
        while (Workspace::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }
        return $slug;
    }
}
