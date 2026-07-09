/**
 * Tests del server.
 * Verifica que el server arranca, /api/health responde 200, y 404 funciona.
 */
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

  it('GET / responde 404 (solo /api está montado)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
  });
});
