/**
 * RAG pipeline (Retrieval-Augmented Generation).
 *
 * Flujo:
 *   1. Embed la pregunta del usuario (embeddings provider swappable).
 *   2. Buscar top-K chunks similares en pgvector (cosine distance).
 *   3. Construir prompt con esos chunks como "contexto citado".
 *   4. Mandar a DeepSeek con system prompt v0.1.
 *   5. Validar que las citas en la respuesta correspondan a chunks reales.
 *
 * El paso 2 depende de pgvector. Si la extension no está instalada, el
 * retrieval devuelve vacío y el oráculo contesta que no tiene información
 * suficiente — preferimos eso a responder con contexto irrelevante.
 */

import { sql } from 'drizzle-orm';
import { db, isDbHealthy, toRows } from '../db/client.js';
import { type KBChunk } from '../db/schema/kb.js';
import { getEmbeddingProvider, cosineSimilarity, EMBEDDING_DIMS } from './embeddings.js';
import { callLLM } from './llm-helper.js';
import { DOBLEUNO_SYSTEM_PROMPT } from '../prompts/system.js';
import { log } from './logger.js';
import type { Citation } from '@dobleuno/shared';

export interface AskInput {
  question: string;
  faction?: 'empire' | 'bretonnia';
  limit?: number; // default 5
}

export interface AskOutput {
  answer: string;
  citations: Citation[];
  chunksUsed: number;
  provider: string;
  /** De dónde salió el contexto. 'none' = no se recuperó ningún chunk. */
  fallback: 'pgvector' | 'none';
}

const DEFAULT_LIMIT = 5;

/**
 * Ejecuta el pipeline RAG completo.
 * Devuelve respuesta + citations validadas.
 */
export async function ask(input: AskInput): Promise<AskOutput> {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const provider = getEmbeddingProvider();

  // 1. Embed la pregunta
  const questionVec = await provider.embed(input.question);

  // 2. Buscar chunks relevantes
  const chunks = await retrieveChunks({
    questionVec,
    faction: input.faction,
    limit,
    expectedDims: provider.dims,
  });

  if (chunks.length === 0) {
    // Sin contexto → respuesta honesta
    return {
      answer:
        'No tengo información suficiente en la base de conocimiento para responder esa pregunta. Probá reformularla o consultar el reglamento oficial.',
      citations: [],
      chunksUsed: 0,
      provider: provider.name,
      fallback: chunks.length === 0 ? 'none' : 'pgvector',
    };
  }

  // 3. Construir prompt con contexto
  const userPrompt = buildUserPrompt(input.question, chunks);

  // 4. Llamar al LLM
  const llmResponse = await callLLM({
    system: DOBLEUNO_SYSTEM_PROMPT,
    user: userPrompt,
    temperature: 0.3,
    // Los tokens de razonamiento salen de acá: ver MAX_TOKENS_DEFAULT.
    maxTokens: 2000,
  });

  // 5. Extraer y validar citations
  const citations = extractCitations(llmResponse, chunks);

  return {
    answer: llmResponse,
    citations,
    chunksUsed: chunks.length,
    provider: provider.name,
    fallback: 'pgvector',
  };
}

// ─── Retrieval ────────────────────────────────────────────────────────────

interface RetrieveInput {
  questionVec: number[];
  faction?: string;
  limit: number;
  expectedDims: number;
}

async function retrieveChunks(input: RetrieveInput): Promise<KBChunk[]> {
  if (!(await isDbHealthy())) return [];

  try {
    const vecLiteral = `[${input.questionVec.join(',')}]`;
    const factionFilter = input.faction ? sql`AND faction = ${input.faction}` : sql``;
    const rows = toRows(
      await db.execute(sql`
      SELECT id, source, ref, title, text, faction, embedding, created_at,
             embedding_vec <=> ${vecLiteral}::vector AS distance
      FROM kb_chunks
      WHERE embedding_vec IS NOT NULL
      ${factionFilter}
      ORDER BY embedding_vec <=> ${vecLiteral}::vector
      LIMIT ${input.limit}
    `),
    );
    if (rows.length > 0) {
      return rows.map(rowToChunk);
    }
  } catch (err) {
    // Sin pgvector no hay segundo intento: devolvemos vacío y ask() responde
    // que no tiene información suficiente.
    log.error('pgvector search failed', { error: (err as Error).message });
  }

  return [];
}

function rowToChunk(row: Record<string, unknown>): KBChunk {
  return {
    id: String(row.id),
    source: row.source as KBChunk['source'],
    ref: String(row.ref),
    title: String(row.title),
    text: String(row.text),
    faction: typeof row.faction === 'string' ? row.faction : null,
    embedding: String(row.embedding),
    createdAt: row.created_at as Date,
  };
}

// ─── Prompt building ──────────────────────────────────────────────────────

function buildUserPrompt(question: string, chunks: KBChunk[]): string {
  const context = chunks
    .map(
      (c, i) =>
        `[${i + 1}] Fuente: ${c.source} | Ref: ${c.ref} | ${c.title}\n${c.text}`,
    )
    .join('\n\n---\n\n');

  return `Contexto de la base de conocimiento de TOW:

${context}

---

Pregunta del usuario: ${question}

Respondé en español argentino, citing usando el formato [cita:N] donde N es el número del chunk. Si el contexto no alcanza, decílo.`;
}

/**
 * Extrae citas del formato [cita:N] del texto del LLM y las mapea a los chunks reales.
 * Valida que cada N esté en rango y que el chunk referenciado exista.
 */
export function extractCitations(text: string, chunks: KBChunk[]): Citation[] {
  const regex = /\[cita:(\d+)\]/g;
  const citations: Citation[] = [];
  const seen = new Set<number>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const n = Number.parseInt(match[1] ?? '', 10);
    if (Number.isNaN(n) || n < 1 || n > chunks.length) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    const chunk = chunks[n - 1];
    if (!chunk) continue;
    citations.push({
      ref: chunk.ref,
      title: chunk.title,
      text: chunk.text.slice(0, 200) + (chunk.text.length > 200 ? '…' : ''),
      source: chunk.source,
    });
  }

  return citations;
}

/**
 * Helper para tests: re-rankea un set de chunks usando cosine similarity
 * contra un vector de query. Útil para tests deterministas del retrieval.
 */
export function rerankByCosine(
  queryVec: number[],
  chunks: KBChunk[],
): Array<KBChunk & { score: number }> {
  return chunks
    .map((c) => {
      const vec = JSON.parse(c.embedding) as number[];
      const score = cosineSimilarity(queryVec, vec);
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score);
}

// Re-export para no romper imports existentes
export { EMBEDDING_DIMS };