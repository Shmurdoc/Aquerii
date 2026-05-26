// src/auth/jwt.ts — JWT payload type shared across handlers
// Note: token verification is handled by sanctum.ts (Sanctum token introspection).
// This file exists only for the JWTPayload type used in catchupHandler.

export interface JWTPayload {
  sub: string           // user_id
  workspace_id: string
  name?: string
  avatar_url?: string
  role?: string
  iat: number
  exp: number
}
