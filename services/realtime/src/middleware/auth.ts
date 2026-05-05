// src/middleware/auth.ts — verifies token and attaches user + workspace context
import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../index';

const JWT_SECRET = process.env.JWT_SECRET ?? '';

export interface AuthPayload {
  sub: string;          // user_id
  workspace_id: string;
  name: string;
  email: string;
}

export async function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  const token =
    socket.handshake.auth?.token as string | undefined ??
    (socket.handshake.headers.authorization ?? '').replace('Bearer ', '');

  if (!token) {
    return next(new Error('AUTH_REQUIRED'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;

    socket.data.userId      = payload.sub;
    socket.data.workspaceId = payload.workspace_id;
    socket.data.name        = payload.name;

    next();
  } catch (err) {
    logger.warn({ err }, 'Socket auth failed');
    next(new Error('AUTH_INVALID'));
  }
}
