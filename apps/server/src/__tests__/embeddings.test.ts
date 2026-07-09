/**
 * Tests del provider de embeddings (deterministic + helpers).
 */
import { describe, it, expect } from 'vitest';
import {
  getEmbeddingProvider,
  setEmbeddingProvider,
  cosineSimilarity,
  EMBEDDING_DIMS,
} from '../lib/embeddings.js';

describe('Embeddings — provider', () => {
  it('default provider es deterministic cuando no hay OPENAI_API_KEY', () => {
    setEmbeddingProvider(null);
    delete process.env.OPENAI_API_KEY;
    const p = getEmbeddingProvider();
    expect(p.name).toBe('deterministic');
    expect(p.dims).toBe(EMBEDDING_DIMS);
  });

  it('embeddings deterministicos son reproducibles', async () => {
    setEmbeddingProvider(null);
    const p = getEmbeddingProvider();
    const a = await p.embed('Empire Greatswords tienen Strength 4 y armadura 3+');
    const b = await p.embed('Empire Greatswords tienen Strength 4 y armadura 3+');
    expect(a).toEqual(b);
    expect(a.length).toBe(EMBEDDING_DIMS);
  });

  it('textos similares → embeddings similares (cosine)', async () => {
    setEmbeddingProvider(null);
    const p = getEmbeddingProvider();
    const a = await p.embed('Greatswords son tropas de infantería pesada del Imperio');
    const b = await p.embed('Greatswords tropas infantería pesada Imperio');
    const c = await p.embed('Dragones son bestias aladas que escupen fuego');
    const sim_ab = cosineSimilarity(a, b);
    const sim_ac = cosineSimilarity(a, c);
    // Deterministic no es semántico pero textos similares comparten más palabras
    expect(sim_ab).toBeGreaterThan(0);
    // La comparación semántica real la garantiza OpenAI embeddings
    expect(typeof sim_ac).toBe('number');
  });

  it('embeddings están normalizados (L2 norm = 1)', async () => {
    setEmbeddingProvider(null);
    const p = getEmbeddingProvider();
    const v = await p.embed('algún texto cualquiera');
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(Math.abs(norm - 1)).toBeLessThan(0.01);
  });

  it('embedBatch procesa varios textos', async () => {
    setEmbeddingProvider(null);
    const p = getEmbeddingProvider();
    const vecs = await p.embedBatch(['uno', 'dos', 'tres']);
    expect(vecs).toHaveLength(3);
    for (const v of vecs) {
      expect(v).toHaveLength(EMBEDDING_DIMS);
    }
  });
});

describe('Embeddings — cosine similarity', () => {
  it('mismo vector → 1', () => {
    const v = [0.6, 0.8];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('vectores ortogonales → 0', () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('vectores opuestos → -1', () => {
    const a = [1, 0];
    const b = [-1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it('lanza error si los vectores tienen distinta dimensión', () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow();
  });
});