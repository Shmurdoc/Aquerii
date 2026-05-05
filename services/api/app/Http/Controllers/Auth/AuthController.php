<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use PragmaRX\Google2FA\Google2FA;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                  => 'required|string|max:255',
            'email'                 => 'required|email|unique:users,email',
            'password'              => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
            'workspace_name'        => 'required|string|max:255',
        ]);

        [$user, $workspace, $token] = $this->authService->register($data);

        return response()->json([
            'data' => [
                'user'      => $this->userShape($user),
                'workspace' => $this->workspaceShape($workspace),
                'token'     => $token,
            ],
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
            'mfa_code' => 'nullable|string|size:6',
        ]);

        $result = $this->authService->login($data);

        if ($result === 'MFA_REQUIRED') {
            return response()->json([
                'data' => ['mfa_required' => true],
            ], 200);
        }

        [$user, $token] = $result;

        return response()->json([
            'data' => [
                'user'  => $this->userShape($user),
                'token' => $token,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['data' => ['message' => 'Logged out.']]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $request->validate(['token' => 'required|string']);
        $token = $this->authService->refreshToken($request->input('token'));
        return response()->json(['data' => ['token' => $token]]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        $this->authService->sendPasswordReset($request->input('email'));
        return response()->json(['data' => ['message' => 'If that email exists, a reset link has been sent.']]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token'    => 'required|string',
            'email'    => 'required|email',
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);
        $this->authService->resetPassword($data);
        return response()->json(['data' => ['message' => 'Password reset successfully.']]);
    }

    public function verifyEmail(Request $request, string $id, string $hash): JsonResponse
    {
        $this->authService->verifyEmail($id, $hash, $request);
        return response()->json(['data' => ['message' => 'Email verified.']]);
    }

    public function enableMfa(Request $request): JsonResponse
    {
        $user = $request->user();
        [$secret, $qrUrl, $recoveryCodes] = $this->authService->enableMfa($user);

        return response()->json([
            'data' => [
                'secret'         => $secret,
                'qr_url'         => $qrUrl,
                'recovery_codes' => $recoveryCodes,
            ],
        ]);
    }

    public function verifyMfa(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string']);
        $ok = $this->authService->verifyMfaCode($request->user(), $request->input('code'));
        if (!$ok) {
            return response()->json(['error' => ['code' => 'MFA_INVALID', 'message' => 'Invalid MFA code.']], 422);
        }
        return response()->json(['data' => ['verified' => true]]);
    }

    private function userShape(User $user): array
    {
        return [
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'avatar_url' => $user->avatar_url,
            'locale'     => $user->locale,
            'timezone'   => $user->timezone,
            'mfa_enabled'=> $user->two_factor_enabled,
        ];
    }

    private function workspaceShape(Workspace $workspace): array
    {
        return [
            'id'   => $workspace->id,
            'name' => $workspace->name,
            'slug' => $workspace->slug,
            'plan' => $workspace->plan,
        ];
    }
}
