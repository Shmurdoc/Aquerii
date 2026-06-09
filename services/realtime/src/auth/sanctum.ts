// src/auth/sanctum.ts
// Validates a Laravel Sanctum opaque token by calling the API /me endpoint.
// Results are cached in Redis for 5 minutes to avoid hammering the API on
// every socket event.

import { Redis } from 'ioredis'
import axios from 'axios'

export interface SanctumUser {
  sub: string           // user id
  workspace_id: string
  name: string
  avatar_url: string | null
  role?: string
}

const CACHE_TTL_SECONDS = 300 // 5 minutes

export async function verifySanctumToken(
  token: string,
  apiUrl: string,
  redisClient: Redis,
): Promise<SanctumUser> {
  const cacheKey = `sanctum_token:${token}`

  // 1. Check Redis cache first
  const cached = await redisClient.get(cacheKey)
  if (cached) {
    return JSON.parse(cached) as SanctumUser
  }

  // 2. Call API /me
  const res = await axios.get(`${apiUrl}/api/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    timeout: 5000,
    validateStatus: () => true,
  })

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`AUTH_INVALID: API returned ${res.status}`)
  }

  const body = res.data as { data: { id: string; name: string; avatar_url: string | null; workspace?: { id: string; role?: string } } }
  const data = body.data

  if (!data?.id) {
    throw new Error('AUTH_INVALID: Unexpected /me response shape')
  }

  const user: SanctumUser = {
    sub:          data.id,
    workspace_id: data.workspace?.id ?? '',
    name:         data.name,
    avatar_url:   data.avatar_url ?? null,
    role:         data.workspace?.role,
  }

  // 3. Cache in Redis
  await redisClient.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(user))

  return user
}

/**
 * Invalidate a cached token (call this on logout/token revocation).
 */
export async function invalidateSanctumToken(token: string, redisClient: Redis): Promise<void> {
  await redisClient.del(`sanctum_token:${token}`)
}
