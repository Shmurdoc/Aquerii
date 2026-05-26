<?php

namespace App\Core\Services;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use PragmaRX\Google2FA\Google2FA;

class AuthService
{
    private const TOKEN_EXPIRY_DAYS = 30;

    private const MFA_TOKEN_TTL = 300; // 5 minutes

    public function register(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password_hash' => Hash::make($data['password']),
            ]);

            $slug = $this->uniqueSlug($data['workspace_name']);
            $workspace = Workspace::create([
                'name' => $data['workspace_name'],
                'slug' => $slug,
            ]);

            WorkspaceMember::create([
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
                'role' => 'owner',
                'status' => 'active',
                'joined_at' => now(),
            ]);

            event(new Registered($user));

            $expiresAt = now()->addDays(self::TOKEN_EXPIRY_DAYS);
            $token = $user->createToken('auth', ['*'], $expiresAt)->plainTextToken;

            return [$user, $workspace, $token, $expiresAt->toIso8601String()];
        });
    }

    public function login(array $data): array|string
    {
        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password_hash)) {
            abort(401, json_encode([
                'error' => ['code' => 'INVALID_CREDENTIALS', 'message' => 'Email or password is incorrect.'],
            ]));
        }

        if ($user->two_factor_enabled) {
            if (empty($data['mfa_code'])) {
                return 'MFA_REQUIRED';
            }

            $code = $data['mfa_code'];

            $g2fa = new Google2FA;
            $validTotp = $g2fa->verifyKey(decrypt($user->two_factor_secret), $code);

            if (! $validTotp) {
                $validRecovery = $this->consumeRecoveryCode($user, $code);
                if (! $validRecovery) {
                    abort(422, json_encode([
                        'error' => ['code' => 'MFA_INVALID', 'message' => 'Invalid MFA code.'],
                    ]));
                }
            }
        }

        $user->update(['last_seen_at' => now()]);
        $expiresAt = now()->addDays(self::TOKEN_EXPIRY_DAYS);
        $token = $user->createToken('auth', ['*'], $expiresAt)->plainTextToken;

        return [$user, $token, $expiresAt->toIso8601String()];
    }

    public function generateMfaToken(string $email): string
    {
        $user = User::where('email', $email)->firstOrFail();
        $mfaToken = Str::random(64);
        cache()->put("mfa_token:{$mfaToken}", $user->id, self::MFA_TOKEN_TTL);

        return $mfaToken;
    }

    public function verifyMfaWithToken(string $mfaToken, string $code): array|false
    {
        $userId = cache()->pull("mfa_token:{$mfaToken}");
        if (! $userId) {
            return false;
        }

        $user = User::find($userId);
        if (! $user || ! $user->two_factor_enabled) {
            return false;
        }

        $g2fa = new Google2FA;
        $validTotp = $g2fa->verifyKey(decrypt($user->two_factor_secret), $code);

        if (! $validTotp) {
            $validRecovery = $this->consumeRecoveryCode($user, $code);
            if (! $validRecovery) {
                return false;
            }
        }

        $user->update(['last_seen_at' => now()]);
        $expiresAt = now()->addDays(self::TOKEN_EXPIRY_DAYS);
        $token = $user->createToken('auth', ['*'], $expiresAt)->plainTextToken;

        return [$user, $token, $expiresAt->toIso8601String()];
    }

    public function refreshToken(string $token): array
    {
        $pat = PersonalAccessToken::findToken($token);
        if (! $pat) {
            abort(401, json_encode(['error' => ['code' => 'TOKEN_INVALID']]));
        }
        $user = $pat->tokenable;
        $pat->delete();

        $expiresAt = now()->addDays(self::TOKEN_EXPIRY_DAYS);
        $newToken = $user->createToken('auth', ['*'], $expiresAt)->plainTextToken;

        return [$newToken, $expiresAt->toIso8601String()];
    }

    public function resendVerification(string $email): void
    {
        $user = User::where('email', $email)->first();
        if ($user && is_null($user->email_verified_at)) {
            $user->sendEmailVerificationNotification();
        }
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
                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            abort(422, json_encode(['error' => ['code' => 'RESET_FAILED', 'message' => __($status)]]));
        }
    }

    public function verifyEmail(string $id, string $hash, Request $request): void
    {
        $user = User::findOrFail($id);

        if (! hash_equals(sha1($user->email), $hash)) {
            abort(403, json_encode(['error' => ['code' => 'EMAIL_VERIFY_INVALID']]));
        }

        if (! $user->email_verified_at) {
            $user->update(['email_verified_at' => now()]);
            event(new Verified($user));
        }
    }

    public function enableMfa(User $user): array
    {
        $g2fa = new Google2FA;
        $secret = $g2fa->generateSecretKey();
        $qrUrl = $g2fa->getQRCodeUrl('Aquerii', $user->email, $secret);

        $plainCodes = collect(range(1, 8))->map(fn () => Str::upper(Str::random(5).'-'.Str::random(5)))->all();
        $hashedCodes = array_map(fn ($c) => Hash::make($c), $plainCodes);

        $user->update([
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode($hashedCodes)),
            'two_factor_enabled' => true,
        ]);

        return [$secret, $qrUrl, $plainCodes];
    }

    private function consumeRecoveryCode(User $user, string $code): bool
    {
        $hashedCodes = json_decode(decrypt($user->two_factor_recovery_codes), true);
        if (! is_array($hashedCodes)) {
            return false;
        }

        foreach ($hashedCodes as $i => $hashed) {
            if (Hash::check($code, $hashed)) {
                unset($hashedCodes[$i]);
                $user->update([
                    'two_factor_recovery_codes' => encrypt(json_encode(array_values($hashedCodes))),
                ]);

                return true;
            }
        }

        return false;
    }

    public function verifyMfaCode(User $user, string $code): bool
    {
        $g2fa = new Google2FA;
        $secret = decrypt($user->two_factor_secret);

        return (bool) $g2fa->verifyKey($secret, $code);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;
        while (Workspace::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
