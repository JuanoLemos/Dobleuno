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
  fallback: OrigenDelContexto;
}

const DEFAULT_LIMIT = 5;

/**
 * De dónde salieron los chunks que el LLM terminó leyendo.
 *
 * Viaja hasta la respuesta de `/api/ask` y hay que mantenerlo honesto: cuando
 * el retrieval pasó a ser léxico, este campo siguió diciendo 'pgvector' y la
 * API afirmaba durante días una cosa por otra. Nada fallaba — el valor es
 * informativo — pero es exactamente el tipo de dato que después se usa para
 * diagnosticar, y mentía.
 */
export type OrigenDelContexto = 'lexico' | 'pgvector' | 'none';

/**
 * ¿Este provider produce vectores con significado, o es el stub de dev?
 *
 * El `deterministic` hashea cada palabra a uno de 384 buckets. Sirve para que
 * los tests corran sin API key y para que el seed llene la columna, pero sus
 * vectores no se parecen entre sí por parecerse los textos. Consultarlo es
 * pedirle una opinión a un generador de números.
 *
 * Se pregunta por el nombre y no por una propiedad del provider porque la
 * lista es corta y explícita: cualquier provider nuevo es semántico salvo que
 * se agregue acá.
 */
function esSemantico(provider: { name: string }): boolean {
  return provider.name !== 'deterministic';
}

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
  const { chunks, via } = await retrieveChunks({
    questionVec,
    pregunta: input.question,
    faction: input.faction,
    limit,
    expectedDims: provider.dims,
    providerSemantico: esSemantico(provider),
  });

  if (chunks.length === 0) {
    // Sin contexto → respuesta honesta
    return {
      answer:
        'No tengo información suficiente en la base de conocimiento para responder esa pregunta. Probá reformularla o consultar el reglamento oficial.',
      citations: [],
      chunksUsed: 0,
      provider: provider.name,
      fallback: via,
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
    fallback: via,
  };
}

// ─── Retrieval ────────────────────────────────────────────────────────────

export interface RetrieveInput {
  questionVec: number[];
  /** La pregunta en texto: la búsqueda léxica la necesita, el vector no. */
  pregunta?: string;
  faction?: string;
  limit: number;
  expectedDims: number;
  /**
   * ¿El provider de embeddings entiende de significado?
   *
   * Con el `deterministic` esto es false y el vector ni se consulta. Ver el
   * comentario de `retrieveChunks`.
   */
  providerSemantico?: boolean;
}

/**
 * Búsqueda léxica sobre `kb_chunks.tsv` (ver `extra_busqueda_lexica.sql`).
 *
 * ── Por qué OR entre lexemas y no `websearch_to_tsquery` ─────────────────
 *
 * `websearch_to_tsquery` y `plainto_tsquery` unen los términos con AND, así
 * que "¿cómo funciona Killing Blow?" exige que el chunk contenga también
 * "cómo" y "funciona". Ninguna ficha del reglamento dice eso: la consulta
 * devolvía CERO filas. Medido sobre el set de eval: con AND las preguntas en
 * prosa daban 1/5; con OR, 3/5 — y las de nombre exacto siguen en 6/6, porque
 * `ts_rank_cd` premia al documento que matchea más términos, y el título pesa
 * 'A'.
 *
 * Los lexemas salen de pasar la pregunta por el MISMO `to_tsvector('spanish')`
 * que generó la columna. Así no hay que construir la tsquery a mano —comillas,
 * acentos, signos de pregunta— y consulta y documento quedan stemmeados igual.
 */
async function buscarLexico(pregunta: string, input: RetrieveInput): Promise<KBChunk[]> {
  const factionFilter = input.faction ? sql`AND faction = ${input.faction}` : sql``;
  const rows = toRows(
    await db.execute(sql`
      WITH q AS (
        SELECT array_to_string(
                 tsvector_to_array(to_tsvector('spanish', ${pregunta})), ' | '
               )::tsquery AS tsq
      )
      SELECT id, source, ref, title, text, faction, embedding, created_at,
             ts_rank_cd(tsv, q.tsq) AS score
      FROM kb_chunks, q
      WHERE tsv @@ q.tsq
      ${factionFilter}
      ORDER BY score DESC
      LIMIT ${input.limit}
    `),
  );
  return rows.map(rowToChunk);
}

async function buscarPorVector(input: RetrieveInput): Promise<KBChunk[]> {
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
  return rows.map(rowToChunk);
}

/**
 * Recupera los chunks que el oráculo le va a pasar al LLM.
 *
 * ── Por qué lo léxico va primero, y por qué el vector puede no correr ────
 *
 * Esto era sólo búsqueda por vectores, y el provider que corre en producción
 * es el "determinístico": un hash de cada palabra a uno de 384 buckets. No es
 * un embedding — no tiene ninguna noción de significado, y con miles de
 * palabras distintas en 384 buckets las colisiones lo vuelven ruido estable.
 *
 * Medido con `src/eval-retrieval.ts` sobre 15 preguntas reales: **recall@5 =
 * 0/15**. Ni siquiera escribiendo el nombre exacto de la regla. Y nada
 * fallaba: `ask()` devolvía 200, con citas válidas a los chunks equivocados y
 * una respuesta cortés diciendo que no tenía información suficiente.
 *
 * Con lo léxico primero: 9/15, y 6/6 cuando la pregunta es el nombre.
 *
 * El vector sólo entra si el provider es semántico de verdad. Sumar ruido a un
 * resultado bueno lo empeora, y el `deterministic` es un stub de desarrollo
 * que nunca debió manejar el retrieval de producción.
 *
 * Cuando haya un provider real esto pasa a ser fusión de las dos listas: lo
 * léxico gana los nombres exactos, y lo semántico tiene que ganar las
 * preguntas que describen el efecto sin nombrar la regla — hoy 0/4, y es el
 * techo conocido de este enfoque.
 */
export interface Recuperacion {
  chunks: KBChunk[];
  /** Qué camino los trajo. Se reporta tal cual en `/api/ask`. */
  via: OrigenDelContexto;
}

export async function retrieveChunks(input: RetrieveInput): Promise<Recuperacion> {
  if (!(await isDbHealthy())) return { chunks: [], via: 'none' };

  if (input.pregunta) {
    try {
      const lexicos = await buscarLexico(input.pregunta, input);
      if (lexicos.length > 0) return { chunks: lexicos, via: 'lexico' };
    } catch (err) {
      log.error('búsqueda léxica falló', { error: (err as Error).message });
    }
  }

  // Sin provider semántico no hay segunda chance. Devolver ruido es peor que
  // devolver nada: con 0 chunks `ask()` admite que no sabe, y con 5 chunks
  // irrelevantes contesta convencido.
  if (!input.providerSemantico) return { chunks: [], via: 'none' };

  try {
    const porVector = await buscarPorVector(input);
    return { chunks: porVector, via: porVector.length > 0 ? 'pgvector' : 'none' };
  } catch (err) {
    log.error('pgvector search failed', { error: (err as Error).message });
    return { chunks: [], via: 'none' };
  }
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