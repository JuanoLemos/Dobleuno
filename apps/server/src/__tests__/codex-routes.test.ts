/**
 * Ola 11 — Tests de ruteo de la API del Codex.
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────
 *
 * El router de reglas se monta en `/api` pero declaraba sus rutas como
 * `/search` y `/stats`, mientras el cliente llamaba a `/api/rules/search` y
 * `/api/kb/stats`. Eran 404 desde la Ola 2 y nadie se enteró, porque no había
 * un solo test que tocara estas rutas.
 *
 * El truco para testear esto sin Postgres: una ruta que existe responde 503
 * ("Database not available") y una que no existe responde 404. O sea que el
 * 503 es la prueba de que el path matcheó — que es exactamente lo que se
 * rompió. Los datos se prueban con la base levantada, aparte.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Codex — las rutas existen', () => {
  const app = createApp();

  const rutas = [
    '/api/rules',
    '/api/rules/sections',
    '/api/rules/great-weapon',
    '/api/items',
    '/api/items/types',
    '/api/items/sword-of-battle',
    '/api/units',
    '/api/units/unit-greatswords',
    '/api/kb/search?q=animosity',
    '/api/kb/stats',
  ];

  for (const ruta of rutas) {
    it(`GET ${ruta} matchea (no 404)`, async () => {
      const res = await request(app).get(ruta);
      expect(res.status).not.toBe(404);
      // Sin DB en el runner, la respuesta esperada es 503.
      expect([200, 503]).toContain(res.status);
    });
  }

  it('una ruta inventada sí da 404 — el chequeo de arriba distingue algo', async () => {
    const res = await request(app).get('/api/reglas-que-no-existen');
    expect(res.status).toBe(404);
  });
});

describe('Codex — validación de query params', () => {
  const app = createApp();

  it('rechaza un page no numérico antes de tocar la base', async () => {
    const res = await request(app).get('/api/rules?page=abc');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Bad request');
  });

  it('rechaza un limit fuera de rango', async () => {
    const res = await request(app).get('/api/items?limit=9999');
    expect(res.status).toBe(400);
  });

  it('acepta los filtros del Codex', async () => {
    const res = await request(app).get('/api/items?type=Weapon&family=arcane-items&q=fuego');
    expect([200, 503]).toContain(res.status);
  });
});
