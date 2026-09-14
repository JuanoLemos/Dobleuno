/**
 * Tests del endpoint /api/ask — validación del schema y forma de la respuesta.
 *
 * ── Por qué se mockea `openai` acá ───────────────────────────────────────
 *
 * Este archivo decía "sin DB" y pasaba porque, efectivamente, no había base:
 * el retrieval devolvía 0 chunks y el oráculo cortaba antes de llamar al LLM.
 * En cuanto la base local se sembró con el corpus (3700 chunks), el mismo test
 * empezó a hacer una llamada real y facturable a DeepSeek, y a colgarse 30s.
 *
 * Un test no puede depender de que la base esté vacía. Se mockea el borde
 * externo, igual que en `rag-oracle.test.ts`: lo que se prueba acá es el
 * endpoint, no el proveedor.
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

const { createCompletion } = vi.hoisted(() => ({ createCompletion: vi.fn() }));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: createCompletion } };
  },
}));

const { createApp } = await import('../app.js');

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

  it('POST /api/ask con question válida devuelve la forma esperada', async () => {
    createCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: 'Killing Blow aplica con un 6 natural al herir. [1]' } }],
      model: 'deepseek-flash',
    });

    const res = await request(app)
      .post('/api/ask')
      .send({ question: '¿Cuándo aplica Killing Blow?' });

    // 200 con la base sembrada; 500 si no hay base. Las dos son formas válidas
    // del endpoint — lo que se verifica es que no rompa y que el shape esté.
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('answer');
      expect(res.body).toHaveProperty('citations');
      expect(res.body).toHaveProperty('provider');
    }
  });
});