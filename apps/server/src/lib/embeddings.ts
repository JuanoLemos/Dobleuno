/**
 * Embeddings provider — abstract interface + 2 implementaciones:
 *   1. OpenAI (text-embedding-3-small, 1536 dims)
 *   2. Deterministic (hash-based 384 dims, para dev/test sin API key)
 *
 * El provider activo se elige según env vars:
 *   - Si OPENAI_API_KEY está set → OpenAI (producción)
 *   - Si no → Deterministic (dev/test, no requiere internet)
 *
 * Ambos retornan `number[]` normalizado a unit length (L2 norm = 1).
 * Eso permite usar cosine similarity como dot product.
 */
import OpenAI from 'openai';
import { log } from './logger.js';

export const EMBEDDING_DIMS = 384; // Debe matchear la columna pgvector
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const OPENAI_EMBEDDING_DIMS = 1536;

export interface EmbeddingProvider {
  readonly name: string;
  readonly dims: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Provider determinístico (fallback).
 * Usa SHA-256 → split en chunks → mapea a floats en [-1, 1].
 * No es semánticamente correcto pero es estable y testeable.
 * Sirve para development sin gastar API calls de OpenAI.
 */
class DeterministicEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'deterministic';
  readonly dims = EMBEDDING_DIMS;

  // eslint-disable-next-line @typescript-eslint/require-await
  async embed(text: string): Promise<number[]> {
    const vec = new Array<number>(this.dims).fill(0);
    const normalized = text.toLowerCase().trim();

    // 1. Bag-of-words: cada palabra aporta a su bucket
    const words = normalized.split(/\s+/).filter(Boolean);
    for (const word of words) {
      const hash = simpleHash(word);
      const idx = hash % this.dims;
      const sign = hash % 2 === 0 ? 1 : -1;
      vec[idx] = (vec[idx] ?? 0) + sign;
    }

    // 2. Bigramas (window 2)
    for (let i = 0; i < words.length - 1; i++) {
      const w1 = words[i];
      const w2 = words[i + 1];
      if (!w1 || !w2) continue;
      const hash = simpleHash(`${w1} ${w2}`);
      const idx = hash % this.dims;
      const sign = hash % 2 === 0 ? 1 : -1;
      vec[idx] = (vec[idx] ?? 0) + sign * 0.5;
    }

    return normalize(vec);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

/**
 * Provider OpenAI (producción).
 * Requiere OPENAI_API_KEY.
 */
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dims = OPENAI_EMBEDDING_DIMS; // ⚠️ diferente a EMBEDDING_DIMS, requiere migración
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: text,
    });
    const vec = res.data[0]?.embedding ?? [];
    return normalize(vec);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await this.client.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: texts,
    });
    return res.data.map((d) => normalize(d.embedding));
  }
}

let cachedProvider: EmbeddingProvider | null = null;

/** Singleton lazy: solo crea el provider cuando se necesita. */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (cachedProvider) return cachedProvider;
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    log.info('Embeddings provider: openai');
    cachedProvider = new OpenAIEmbeddingProvider(apiKey);
  } else {
    log.warn(
      'Embeddings provider: deterministic (no OPENAI_API_KEY). Solo para dev/test. En producción configurar OPENAI_API_KEY.',
    );
    cachedProvider = new DeterministicEmbeddingProvider();
  }
  return cachedProvider;
}

/** Helper para tests: permite inyectar un provider mock. */
export function setEmbeddingProvider(provider: EmbeddingProvider | null): void {
  cachedProvider = provider;
}

// ─── Utils ────────────────────────────────────────────────────────────────

function simpleHash(str: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function normalize(vec: number[]): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/**
 * Cosine similarity entre dos vectores.
 * Asume que ambos están normalizados (L2 norm = 1).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return dot; // ya normalizados, dot == cosine
}