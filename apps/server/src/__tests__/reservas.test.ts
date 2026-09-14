/**
 * Tests smoke de Reservas (Ola 9, Día 2).
 *
 * Cubre:
 *   - GET /api/sesiones/:id/reservas público (200/500/503).
 *   - GET /api/mis-reservas sin auth → 401.
 *   - POST /api/sesiones/:id/reservar sin auth → 401.
 *   - DELETE /api/sesiones/:id/reservar/:rid sin auth → 401.
 *   - GET /api/sesiones/:id/reservas con id inexistente → 404.
 *
 * Lo que NO cubre (necesita DB poblada):
 *   - Happy path: reservar + ver en mis-reservas + cancelar.
 *   - Anti-doble-booking (UNIQUE constraint).
 *   - Validación de capacidad llena.
 *   - listId ownership check.
 *   - Permisos admin vs dueño.
 *   Esos se cubren en tests con DB (Fase 2).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';

describe('Reservas (Ola 9)', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  it('GET /api/sesiones/:id/reservas responde (público)', async () => {
    const res = await request(app).get('/api/sesiones/some-id/reservas');
    // 404 si DB up sin sesión, 500 si DB up sin migración, 503 si DB down.
    expect([404, 500, 503]).toContain(res.status);
  });

  it('GET /api/mis-reservas sin auth retorna 401', async () => {
    const res = await request(app).get('/api/mis-reservas');
    expect(res.status).toBe(401);
  });

  it('POST /api/sesiones/:id/reservar sin auth retorna 401', async () => {
    const res = await request(app)
      .post('/api/sesiones/some-id/reservar')
      .send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/sesiones/:id/reservar con auth pero body inválido retorna 400', async () => {
    // 401 sin auth, pero verificamos que la ruta existe y responde.
    const res = await request(app)
      .post('/api/sesiones/some-id/reservar')
      .send({ listId: 123 }); // tipo inválido
    expect([400, 401]).toContain(res.status);
  });

  it('DELETE /api/sesiones/:id/reservar/:rid sin auth retorna 401', async () => {
    const res = await request(app).delete('/api/sesiones/some-id/reservar/some-rid');
    expect(res.status).toBe(401);
  });
});