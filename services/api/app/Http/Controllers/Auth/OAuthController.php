<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\OauthAccount;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class OAuthController extends Controller
{
    private const PROVIDERS = ['google', 'github'];

    public function redirect(Request $request, string $provider): RedirectResponse
    {
        $this->validateProvider($provider);
        return Socialite::driver($provider)->stateless()->redirect();
    }

    public function callback(Request $request, string $provider): \Illuminate\Http\JsonResponse
    {
        $this->validateProvider($provider);

        try {
            $social = Socialite::driver($provider)->stateless()->user();
        } catch (\Throwable $e) {
            return response()->json([
                'error' => ['code' => 'OAUTH_FAILED', 'message' => 'OAuth authentication failed.'],
            ], 401);
        }

        [$user, $isNew] = DB::transaction(function () use ($social, $provider) {
            $oauth = OauthAccount::where('provider', $provider)
                ->where('provider_id', $social->getId())
                ->first();

            if ($oauth) {
                $oauth->update([
                    'access_token'  => $social->token,
                    'refresh_token' => $social->refreshToken,
                    'expires_at'    => $social->expiresIn ? now()->addSeconds($social->expiresIn) : null,
                ]);
                return [$oauth->user, false];
            }

            // Find or create user by email
            $user  = User::firstOrCreate(
                ['email' => $social->getEmail()],
                [
                    'name'              => $social->getName() ?? $social->getNickname() ?? 'User',
                    'avatar_url'        => $social->getAvatar(),
                    'email_verified_at' => now(),
                ]
            );

            OauthAccount::create([
                'user_id'       => $user->id,
                'provider'      => $provider,
                'provider_id'   => $social->getId(),
                'access_token'  => $social->token,
                'refresh_token' => $social->refreshToken,
                'expires_at'    => $social->expiresIn ? now()->addSeconds($social->expiresIn) : null,
            ]);

            // Auto-create workspace for brand-new users
            $isNew = $user->wasRecentlyCreated;
            if ($isNew) {
                $slug      = Str::slug($user->name) . '-' . Str::lower(Str::random(5));
                $workspace = Workspace::create(['name' => "{$user->name}'s Workspace", 'slug' => $slug]);
                WorkspaceMember::create([
                    'workspace_id' => $workspace->id,
                    'user_id'      => $user->id,
                    'role'         => 'owner',
                    'status'       => 'active',
                    'joined_at'    => now(),
                ]);
            }

            return [$user, $isNew];
        });

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'data' => [
                'token'   => $token,
                'is_new'  => $isNew,
                'user'    => [
                    'id'         => $user->id,
                    'name'       => $user->name,
                    'email'      => $user->email,
                    'avatar_url' => $user->avatar_url,
                ],
            ],
        ]);
    }

    private function validateProvider(string $provider): void
    {
        if (!in_array($provider, self::PROVIDERS)) {
            abort(404, 'OAuth provider not supported.');
        }
    }
}
