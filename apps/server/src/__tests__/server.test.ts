/**
 * Tests del server.
 * Verifica que el server arranca, /api/health responde 200, y 404 funciona.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';

describe('Dobleuno server', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(() => {
    // Cierra cualquier cosa pendiente
  });

  it('GET /api/health responde 200 con info del server', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'dobleuno-server',
    });
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('dependencies.database'); // 'up' o 'down'
  });

  it('GET /api/unknown retorna 404', async () => {
    const res = await request(app).get('/api/this-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Not found');
  });

  it('GET / sirve el SPA si hay build del cliente, 404 si no', async () => {
    // Ola 11: el server sirve apps/web/dist si existe (SPA fallback fuera de /api).
    // Sin build previo (CI limpio) sigue siendo 404.
    const webDist = process.env.WEB_DIST_DIR
      ? path.resolve(process.env.WEB_DIST_DIR)
      : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../web/dist');
    const res = await request(app).get('/');
    if (existsSync(webDist)) {
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    } else {
      expect(res.status).toBe(404);
    }
  });

  /**
   * Regresión del bug "Invalid origin" en /api/auth/sign-up/email.
   *
   * Causa raíz #1: better-auth v1.6+ lee `trustedOrigins` desde el root
   * de la config (no desde `advanced.trustedOrigins`). Si está mal ubicado,
   * better-auth solo conoce el `baseURL` (http://localhost:3000) y rechaza
   * el Origin del cliente (http://localhost:5173) con 403 INVALID_ORIGIN.
   *
   * Causa raíz #2: el handler de routes/auth.ts reconstruía la Request
   * con el `Content-Type` original (form-urlencoded) pero un body JSON
   * stringificado. Better-auth rechazaba con VALIDATION_ERROR al no poder
   * parsear el body.
   *
   * El fix: (a) mover trustedOrigins al root, (b) forzar content-type
   * application/json en el handler. Verificamos que un signup realista
   * (form-urlencoded + Origin 5173) NO devuelva ni 403 INVALID_ORIGIN ni
   * 400 VALIDATION_ERROR.
   */
  it('POST /api/auth/sign-up/email con form-urlencoded + Origin 5173 funciona (regresión)', async () => {
    const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const res = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Origin', 'http://localhost:5173')
      .type('form')
      .send({ email, password: 'testpass123', name: 'Test User' });

    expect(res.body).not.toMatchObject({ code: 'INVALID_ORIGIN' });
    expect(res.body).not.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
