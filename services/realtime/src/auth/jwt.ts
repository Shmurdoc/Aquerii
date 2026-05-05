// src/auth/jwt.ts — JWT verification for socket connections
import jwt from 'jsonwebtoken'

export interface JWTPayload {
  sub: string           // user_id
  workspace_id: string
  name?: string
  avatar_url?: string
  role?: string
  iat: number
  exp: number
}

export function verifyJWT(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET ?? process.env.REALTIME_SECRET ?? ''
  return jwt.verify(token, secret) as JWTPayload
}
