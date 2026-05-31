"use strict";
// src/auth/sanctum.ts
// Validates a Laravel Sanctum opaque token by calling the API /me endpoint.
// Results are cached in Redis for 5 minutes to avoid hammering the API on
// every socket event.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySanctumToken = verifySanctumToken;
exports.invalidateSanctumToken = invalidateSanctumToken;
const axios_1 = __importDefault(require("axios"));
const CACHE_TTL_SECONDS = 300; // 5 minutes
async function verifySanctumToken(token, apiUrl, redisClient) {
    const cacheKey = `sanctum_token:${token}`;
    // 1. Check Redis cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    // 2. Call API /me
    const res = await axios_1.default.get(`${apiUrl}/api/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
        },
        timeout: 5000,
        validateStatus: () => true,
    });
    if (res.status < 200 || res.status >= 300) {
        throw new Error(`AUTH_INVALID: API returned ${res.status}`);
    }
    const body = res.data;
    const data = body.data;
    if (!data?.id) {
        throw new Error('AUTH_INVALID: Unexpected /me response shape');
    }
    const user = {
        sub: data.id,
        workspace_id: data.workspace?.id ?? '',
        name: data.name,
        avatar_url: data.avatar_url ?? null,
        role: data.workspace?.role,
    };
    // 3. Cache in Redis
    await redisClient.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(user));
    return user;
}
/**
 * Invalidate a cached token (call this on logout/token revocation).
 */
async function invalidateSanctumToken(token, redisClient) {
    await redisClient.del(`sanctum_token:${token}`);
}
//# sourceMappingURL=sanctum.js.map