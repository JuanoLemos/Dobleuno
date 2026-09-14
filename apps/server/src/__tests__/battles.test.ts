/**
 * Tests del router de batallas.
 *
 * Desde la Ola 10 todas las rutas exigen sesión, así que sin cookie la
 * respuesta es 401 antes de tocar Zod o la DB. Eso es lo que fijan estos
 * tests: que ninguna ruta de batallas sea accesible sin auth.
 *
 * Lo que NO cubre (necesita sesión real + DB poblada, Fase 2): el happy path
 * del CRUD, el merge del PATCH, y que un user no pueda leer la batalla de otro.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Battles router — auth (sin sesión)', () => {
  const app = createApp();

  it('GET /api/battles sin auth devuelve 401', async () => {
    const res = await request(app).get('/api/battles');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'Unauthorized' });
  });

  it('GET /api/battles/:id sin auth devuelve 401', async () => {
    const res = await request(app).get('/api/battles/some-uuid');
    expect(res.status).toBe(401);
  });

  it('POST /api/battles sin auth devuelve 401', async () => {
    const res = await request(app).post('/api/battles').send({ name: 'Test', playerListId: 'abc' });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/battles/:id sin auth devuelve 401', async () => {
    const res = await request(app).patch('/api/battles/some-uuid').send({ turn: 2 });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/battles/:id sin auth devuelve 401', async () => {
    const res = await request(app).delete('/api/battles/some-uuid');
    expect(res.status).toBe(401);
  });

  it('el 401 llega antes que la validación de Zod', async () => {
    // Body inválido y sin sesión: gana el 401. Si devolviera 400 querría decir
    // que Zod corre antes que requireAuth y un anónimo puede sondear el schema.
    const res = await request(app).post('/api/battles').send({});
    expect(res.status).toBe(401);
  });
});
