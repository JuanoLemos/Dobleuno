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
//
// IMPORTANTE: el cliente de better-auth usa `application/x-www-form-urlencoded`
// por default, pero better-auth internamente espera JSON. Si pasamos los
// headers originales (con content-type urlencoded) junto a un body JSON,
// better-auth intenta parsear como form-urlencoded, no encuentra los campos,
// y rechaza con VALIDATION_ERROR. Forzamos content-type: application/json.
authRouter.all('/*', async (req, res) => {
  try {
    const headers: Record<string, string> = {
      ...(req.headers as Record<string, string>),
      'content-type': 'application/json',
    };
    const rawBody: unknown = req.body;
    const hasBody =
      req.method !== 'GET' &&
      req.method !== 'HEAD' &&
      typeof rawBody === 'object' &&
      rawBody !== null &&
      Object.keys(rawBody).length > 0;
    const body = hasBody ? JSON.stringify(rawBody) : undefined;
    const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
      method: req.method,
      headers,
      body,
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
