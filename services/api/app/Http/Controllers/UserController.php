<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    // GET /me
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('workspaces');

        return response()->json(['data' => $user]);
    }

    // PUT /me
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'sometimes|string|max:100',
            'password' => 'sometimes|string|min:8|confirmed',
            'avatar'   => 'sometimes|image|max:2048',
        ]);

        $user = $request->user();

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store("avatars/{$user->id}", 's3');
            $validated['avatar_url'] = Storage::disk('s3')->url($path);
            unset($validated['avatar']);
        }

        $user->update($validated);

        return response()->json(['data' => $user->fresh()]);
    }
}
