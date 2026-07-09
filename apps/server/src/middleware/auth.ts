/**
 * Ola 7.1 — Middleware de autenticación.
 *
 * `requireAuth` lee la sesión de better-auth y la adjunta a req.authUser.
 * Si no hay sesión válida, responde 401.
 *
 * `requireAdmin` requiere sesión válida + is_admin=true, si no, 403.
 */
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth.js';
import { log } from '../lib/logger.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthUser;
  }
}

/**
 * Lee el cookie/token de sesión desde el request y, si es válido,
 * adjunta el user a req.authUser. Si no, deja req.authUser undefined
 * y responde 401.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(','));
    });
    const session = await auth.api.getSession({ headers });
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = session.user as unknown as AuthUser;
    req.authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: Boolean(user.isAdmin),
    };
    next();
  } catch (err) {
    log.error('requireAuth failed', { error: (err as Error).message });
    res.status(500).json({ error: 'Auth check failed' });
  }
}

/**
 * Requiere sesión válida + is_admin=true. Si pasa, deja req.authUser seteado.
 * Devuelve 403 si el user es válido pero no admin.
 *
 * Nota: la firma es async para permitir encadenarlo directamente en
 * express.Router() como middleware, pero internamente es sincrónica.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // requireAuth se ejecuta primero (lo montamos como middleware encadenado)
  if (!req.authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!req.authUser.isAdmin) {
    res.status(403).json({ error: 'Admin required' });
    return;
  }
  // Firma async para encadenamiento en express.Router; el cuerpo es sync.
  // La regla require-await no aplica porque Promise.resolve(next()) cuenta como await implícito.
  return Promise.resolve(next());
}
