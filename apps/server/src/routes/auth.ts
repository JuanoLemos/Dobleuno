/**
 * Auth routes — delegate a better-auth.
 * better-auth maneja: signup, signin, signout, session, verify-email, forgot-password, reset-password.
 * Documentación: https://www.better-auth.com/docs
 */
import { Router } from 'express';
import { auth } from '../lib/auth.js';

export const authRouter: Router = Router();

// Catch-all para que better-auth maneje sus rutas.
// better-auth expone un handler universal que enruta según el path.
authRouter.all('/*', async (req, res) => {
  try {
    const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    const response = await auth.handler(request);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const text = await response.text();
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: 'Auth handler error', message: (err as Error).message });
  }
});
