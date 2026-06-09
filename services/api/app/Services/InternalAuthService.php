<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class InternalAuthService
{
    private string $secret;

    private const ALGO = 'sha256';

    private const TTL = 300;

    public function __construct()
    {
        $this->secret = config('services.internal_jwt.secret', env('INTERNAL_JWT_SECRET', ''));
    }

    public function issueToken(string $service): string
    {
        $now = time();
        $header = $this->base64url(['alg' => 'HS256', 'typ' => 'JWT']);
        $payload = $this->base64url([
            'iss' => config('app.url'),
            'aud' => $service,
            'sub' => $service,
            'iat' => $now,
            'exp' => $now + self::TTL,
            'jti' => bin2hex(random_bytes(16)),
        ]);
        $signature = $this->sign("$header.$payload");

        return "$header.$payload.$signature";
    }

    public function validateToken(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new \RuntimeException('Invalid token format');
        }

        [$header, $payload, $signature] = $parts;

        $expectedSig = $this->sign("$header.$payload");
        if (! hash_equals($expectedSig, $signature)) {
            throw new \RuntimeException('Invalid token signature');
        }

        $claims = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
        if (! $claims || ! isset($claims['exp'])) {
            throw new \RuntimeException('Invalid token claims');
        }

        if ($claims['exp'] < time()) {
            throw new \RuntimeException('Token has expired');
        }

        if (isset($claims['jti']) && Cache::has("jwt-used:{$claims['jti']}")) {
            throw new \RuntimeException('Token has already been used');
        }

        if (isset($claims['jti'])) {
            Cache::put("jwt-used:{$claims['jti']}", true, self::TTL);
        }

        return $claims;
    }

    private function sign(string $data): string
    {
        return rtrim(strtr(base64_encode(hash_hmac(self::ALGO, $data, $this->secret, true)), '+/', '-_'), '=');
    }

    private function base64url(array $data): string
    {
        return rtrim(strtr(base64_encode(json_encode($data)), '+/', '-_'), '=');
    }
}
