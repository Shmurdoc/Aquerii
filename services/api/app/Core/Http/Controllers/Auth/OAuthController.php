<?php

namespace App\Core\Http\Controllers\Auth;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\OauthAccount;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
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

    public function callback(Request $request, string $provider): RedirectResponse
    {
        $this->validateProvider($provider);

        if ($request->has('error')) {
            $error = $request->input('error');

            return redirect($this->frontendUrl("/login?error=oauth_{$error}"));
        }

        try {
            $social = Socialite::driver($provider)->stateless()->user();
        } catch (\Throwable $e) {
            return redirect($this->frontendUrl('/login?error=oauth_failed'));
        }

        [$user, $isNew] = DB::transaction(function () use ($social, $provider) {
            $oauth = OauthAccount::where('provider', $provider)
                ->where('provider_id', $social->getId())
                ->first();

            if ($oauth) {
                $oauth->update([
                    'access_token' => encrypt($social->token),
                    'refresh_token' => $social->refreshToken ? encrypt($social->refreshToken) : null,
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

            OauthAccount::create([
                'user_id' => $user->id,
                'provider' => $provider,
                'provider_id' => $social->getId(),
                'access_token' => encrypt($social->token),
                'refresh_token' => $social->refreshToken ? encrypt($social->refreshToken) : null,
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

        $expiresAt = now()->addDays(30);
        $token = $user->createToken('auth', ['*'], $expiresAt)->plainTextToken;

        $fragment = http_build_query([
            'token' => $token,
            'is_new' => $isNew ? '1' : '0',
        ]);

        return redirect($this->frontendUrl("/oauth/callback#{$fragment}"));
    }

    private function frontendUrl(string $path): string
    {
        $base = config('app.frontend_url', 'http://localhost:3000');

        return rtrim($base, '/').$path;
    }

    private function validateProvider(string $provider): void
    {
        if (! in_array($provider, self::PROVIDERS)) {
            abort(404, 'OAuth provider not supported.');
        }
    }
}
