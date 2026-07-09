/**
 * Tests del endpoint /api/ask.
 * Sin DB → verificamos solo schema validation (400) y graceful 500 con mensaje.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Ask endpoint — schema validation', () => {
  const app = createApp();

  it('POST /api/ask con question muy corta devuelve 400', async () => {
    const res = await request(app).post('/api/ask').send({ question: 'no' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Bad request');
  });

  it('POST /api/ask con body vacío devuelve 400', async () => {
    const res = await request(app).post('/api/ask').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/ask con faction inválida devuelve 400', async () => {
    const res = await request(app)
      .post('/api/ask')
      .send({ question: '¿Cuándo aplica Killing Blow?', faction: 'chaos' });
    expect(res.status).toBe(400);
  });

  it('POST /api/ask con limit fuera de rango devuelve 400', async () => {
    const res = await request(app)
      .post('/api/ask')
      .send({ question: '¿Qué son los Greatswords?', limit: 100 });
    expect(res.status).toBe(400);
  });

  it('POST /api/ask con question válida pero sin DB responde 500 o 200', async () => {
    const res = await request(app)
      .post('/api/ask')
      .send({ question: '¿Cuándo aplica Killing Blow?' });
    // Sin DB: el pipeline RAG devuelve el fallback "no tengo info suficiente" con 200
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('answer');
      expect(res.body).toHaveProperty('citations');
      expect(res.body).toHaveProperty('provider');
    }
  });
});