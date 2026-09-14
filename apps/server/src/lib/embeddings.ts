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

/**
 * Singleton lazy: solo crea el provider cuando se necesita.
 *
 * ── El guard de dimensiones (Ola 12) ─────────────────────────────────────
 *
 * Elegía OpenAI con sólo que `OPENAI_API_KEY` existiera, sin mirar nada más.
 * Ese provider devuelve 1536 dimensiones y la columna `embedding_vec` es
 * `vector(384)`. La cadena completa:
 *
 *   key puesta → el seed genera 3700 vectores de 1536 → el trigger de pgvector
 *   no puede castearlos → la excepción se degrada a WARNING → las 3700 filas
 *   quedan con embedding_vec NULL → el retrieval filtra IS NOT NULL y matchea
 *   cero → el oráculo contesta "no tengo información suficiente" a todo.
 *
 * El seed sale con exit 0, `count(*)` da 3700 y el health devuelve 200. Nada
 * en el sistema dice que el oráculo está muerto. Por eso acá se tira en vez de
 * avisar: un provider con dimensiones incompatibles no es una degradación, es
 * corrupción silenciosa de los datos.
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (cachedProvider) return cachedProvider;
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    // Tipado por la interfaz a propósito: con el tipo concreto, `dims` es el
    // literal 1536 y TypeScript marca la comparación como imposible. El guard
    // igual tiene que existir en runtime — es el contrato del provider contra
    // la columna, no una constante contra otra.
    const provider: EmbeddingProvider = new OpenAIEmbeddingProvider(apiKey);
    if (provider.dims !== EMBEDDING_DIMS) {
      throw new Error(
        `El provider de embeddings devuelve ${provider.dims} dimensiones y la columna ` +
          `embedding_vec es vector(${EMBEDDING_DIMS}). Con esta configuración el seed ` +
          'deja los vectores en NULL y el oráculo deja de encontrar nada, sin errores ' +
          'visibles. Sacá OPENAI_API_KEY, o migrá la columna y re-embeddeá el corpus.',
      );
    }
    log.info('Embeddings provider: openai');
    cachedProvider = provider;
  } else {
    log.info(`Embeddings provider: deterministic (${EMBEDDING_DIMS} dims)`);
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