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
 * ── Cómo se distingue "la ruta no existe" de "no hay esa fila" ───────────
 *
 * No por el status: los dos son 404. La primera versión de este archivo
 * afirmaba `status !== 404` y pasaba en local (sin base, todo responde 503)
 * pero fallaba en CI, donde hay Postgres migrado y vacío: pedir
 * `/api/rules/great-weapon` matchea la ruta y devuelve 404 con toda razón.
 *
 * Lo que sí los separa es el cuerpo. El fallback de `app.ts` responde
 * `{ error: 'Not found' }`; los handlers del Codex responden 'Rule not found',
 * 'Item not found', 'Unit not found'. Un 404 genérico es la firma de la ruta
 * que no está montada, y es exactamente lo que este archivo vigila.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

/** Lo que devuelve `app.ts` cuando ningún router matcheó. */
const NO_MATCHEO = 'Not found';

describe('Codex — las rutas están montadas', () => {
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
    it(`GET ${ruta} matchea un handler`, async () => {
      const res = await request(app).get(ruta);
      // Sin base: 503. Con base migrada: 200, o 404 del handler si no hay fila.
      expect([200, 404, 503]).toContain(res.status);
      expect((res.body as { error?: string }).error).not.toBe(NO_MATCHEO);
    });
  }

  it('una ruta inventada sí cae en el fallback — el chequeo de arriba distingue algo', async () => {
    const res = await request(app).get('/api/reglas-que-no-existen');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', NO_MATCHEO);
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
    const res = await request(app).get(
      '/api/items?type=Magic%20Weapon&family=empire-of-man-magic-items-type&q=espada',
    );
    expect([200, 503]).toContain(res.status);
    expect((res.body as { error?: string }).error).not.toBe(NO_MATCHEO);
  });
});
