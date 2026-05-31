<?php

namespace App\Http\Controllers\Auth;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\OAuthAccount;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class OAuthController extends Controller
{
    private const PROVIDERS = ['google', 'github', 'microsoft'];

    public function redirect(Request $request, string $provider): RedirectResponse
    {
        $this->validateProvider($provider);

        $driver = Socialite::driver($provider);
        if (method_exists($driver, 'stateless')) {
            $driver = $driver->stateless();
        }

        return $driver->redirect();
    }

    public function callback(Request $request, string $provider): JsonResponse
    {
        $this->validateProvider($provider);

        try {
            $driver = Socialite::driver($provider);
            if (method_exists($driver, 'stateless')) {
                $driver = $driver->stateless();
            }

            $social = $driver->user();
        } catch (\Throwable $e) {
            return response()->json([
                'error' => ['code' => 'OAUTH_FAILED', 'message' => 'OAuth authentication failed.'],
            ], 401);
        }

        [$user, $isNew] = DB::transaction(function () use ($social, $provider) {
            $oauth = OAuthAccount::where('provider', $provider)
                ->where('provider_id', $social->getId())
                ->first();

            if ($oauth) {
                $oauth->update([
                    'access_token' => Crypt::encryptString($social->token),
                    'refresh_token' => $social->refreshToken ? Crypt::encryptString($social->refreshToken) : null,
                    'expires_at' => $social->expiresIn ? now()->addSeconds($social->expiresIn) : null,
                ]);

                return [$oauth->user, false];
            }

            $user = User::firstOrCreate(
                ['email' => $social->getEmail()],
                [
                    'name' => $social->getName() ?? $social->getNickname() ?? 'User',
                    'avatar_url' => $social->getAvatar(),
                    'email_verified_at' => now(),
                ]
            );

            OAuthAccount::create([
                'user_id' => $user->id,
                'provider' => $provider,
                'provider_id' => $social->getId(),
                'access_token' => Crypt::encryptString($social->token),
                'refresh_token' => $social->refreshToken ? Crypt::encryptString($social->refreshToken) : null,
                'expires_at' => $social->expiresIn ? now()->addSeconds($social->expiresIn) : null,
            ]);

            $isNew = $user->wasRecentlyCreated;
            if ($isNew) {
                $slug = Str::slug($user->name).'-'.Str::lower(Str::random(5));
                $workspace = Workspace::create(['name' => "{$user->name}'s Workspace", 'slug' => $slug]);
                WorkspaceMember::create([
                    'workspace_id' => $workspace->id,
                    'user_id' => $user->id,
                    'role' => 'owner',
                    'status' => 'active',
                    'joined_at' => now(),
                ]);
            }

            return [$user, $isNew];
        });

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $token,
                'is_new' => $isNew,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar_url' => $user->avatar_url,
                ],
            ],
        ]);
    }

    private function validateProvider(string $provider): void
    {
        if (! in_array($provider, self::PROVIDERS)) {
            abort(404, 'OAuth provider not supported.');
        }
    }
}
