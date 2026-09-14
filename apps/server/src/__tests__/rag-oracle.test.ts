/**
 * Tests del oráculo — pipeline RAG de Ola 5 con los dos bordes externos mockeados.
 *
 * Por qué mockear:
 *   - DeepSeek: el CI define `DEEPSEEK_API_KEY: sk-test-mock`, así que cualquier
 *     llamada real vuelve 401 (ver .github/workflows/ci.yml). Mockeamos `openai`,
 *     que es el borde de verdad, para que llm-helper se ejercite igual.
 *   - Postgres: mockeamos `db.execute` para fijar qué chunks "recupera" el
 *     retrieval, sin depender de una DB levantada ni del seed.
 *
 * Lo que SÍ corre de verdad: retrieval → armado del prompt → llm-helper →
 * extracción y validación de citas.
 */
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

import type * as dbClient from '../db/client.js';

const { createCompletion, dbExecute, dbHealthy } = vi.hoisted(() => ({
  createCompletion: vi.fn(),
  dbExecute: vi.fn(),
  dbHealthy: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: createCompletion } };
  },
}));

vi.mock('../db/client.js', async (original) => ({
  // `toRows` se usa tal cual: es una función pura que normaliza la forma del
  // QueryResult, y mockearla sería mockear justamente lo que se quiere probar.
  ...(await original<typeof dbClient>()),
  db: { execute: dbExecute },
  isDbHealthy: dbHealthy,
  pool: { query: vi.fn() },
}));

const { ask } = await import('../lib/rag.js');
const { DEEPSEEK_DEFAULT_MODEL } = await import('../prompts/llm-client.js');
const { resetLLMClient } = await import('../lib/llm-helper.js');
const { DOBLEUNO_SYSTEM_PROMPT } = await import('../prompts/system.js');

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Una fila tal como la devuelve Postgres: snake_case, embedding como texto. */
function chunkRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'chunk-greatswords-stats',
    source: 'unit',
    ref: 'greatswords',
    title: 'Greatswords — Stats',
    text: 'Greatswords (empire, infantry). M4 WS4 BS3 S3 T3 W1 I3 A1 Ld8 Sv5.',
    faction: 'empire',
    embedding: JSON.stringify(new Array(384).fill(0.1)),
    created_at: new Date('2026-07-09T00:00:00.000Z'),
    ...over,
  };
}

/**
 * La forma real del retorno de drizzle/node-postgres: un QueryResult, no un
 * array. Verificado contra drizzle 0.36.4.
 */
function queryResult(rows: Array<Record<string, unknown>>): unknown {
  return { rows, rowCount: rows.length, command: 'SELECT', fields: [] };
}

function llmAnswers(content: string | null): void {
  createCompletion.mockResolvedValue({ choices: [{ message: { content } }] });
}

const prevKey = process.env.DEEPSEEK_API_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  resetLLMClient();
  // Con la key seteada, llm-helper toma el camino del cliente real — que acá es
  // el mock de `openai`. Sin key tomaría su propio mock interno y el test no
  // estaría probando el wrapper.
  process.env.DEEPSEEK_API_KEY = 'sk-test-mock';
  dbHealthy.mockResolvedValue(true);
  dbExecute.mockResolvedValue(queryResult([chunkRow()]));
  llmAnswers('Respuesta por defecto.');
});

afterAll(() => {
  if (prevKey === undefined) delete process.env.DEEPSEEK_API_KEY;
  else process.env.DEEPSEEK_API_KEY = prevKey;
});

// ─── Prompt ───────────────────────────────────────────────────────────────

describe('Oráculo — armado del prompt', () => {
  it('manda el system prompt de Dobleuno y los chunks numerados', async () => {
    dbExecute.mockResolvedValue(
      queryResult([
        chunkRow(),
        chunkRow({
          id: 'chunk-rule-killing-blow',
          source: 'rule',
          ref: 'rule-killing-blow',
          title: 'Killing Blow',
          faction: null,
        }),
      ]),
    );
    llmAnswers('Listo. [cita:1]');

    await ask({ question: '¿Cuándo aplica Killing Blow?' });

    expect(createCompletion).toHaveBeenCalledTimes(1);
    const body = createCompletion.mock.calls[0]?.[0] as {
      model: string;
      temperature: number;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    };
    // El modelo sale de DEEPSEEK_MODEL, y el .env del autor puede pisarlo. Se
    // afirma contra el default del código, no contra el ambiente: si no, el
    // test verde depende de la máquina donde corre.
    expect(body.model).toBe(process.env.DEEPSEEK_MODEL ?? DEEPSEEK_DEFAULT_MODEL);
    expect(body.temperature).toBe(0.3);
    // 2000, no 600: los modelos de razonamiento de DeepSeek descuentan los
    // tokens de pensar del mismo presupuesto, y en una consulta de reglas eso
    // son 850-1200 antes de escribir una palabra de la respuesta. Medido
    // contra la API: con 600, `content` vuelve vacío.
    expect(body.max_tokens).toBe(2000);
    expect(body.messages[0]?.role).toBe('system');
    expect(body.messages[0]?.content).toBe(DOBLEUNO_SYSTEM_PROMPT);
    expect(body.messages[1]?.content).toContain('[1] Fuente: unit');
    expect(body.messages[1]?.content).toContain('[2] Fuente: rule');
    expect(body.messages[1]?.content).toContain('¿Cuándo aplica Killing Blow?');
  });
});

// ─── Citas ────────────────────────────────────────────────────────────────

describe('Oráculo — validación de citas', () => {
  it('mapea [cita:N] al chunk que corresponde', async () => {
    dbExecute.mockResolvedValue(
      queryResult([
        chunkRow(),
        chunkRow({
          source: 'rule',
          ref: 'rule-killing-blow',
          title: 'Killing Blow',
          text: 'En un 6 natural para herir, la wound se convierte en casualty.',
        }),
      ]),
    );
    llmAnswers('Killing Blow convierte la wound en casualty [cita:2].');

    const res = await ask({ question: '¿Cuándo aplica Killing Blow?' });

    expect(res.chunksUsed).toBe(2);
    expect(res.citations).toHaveLength(1);
    expect(res.citations[0]).toMatchObject({
      ref: 'rule-killing-blow',
      title: 'Killing Blow',
      source: 'rule',
    });
  });

  it('descarta citas fuera de rango en vez de inventar la fuente', async () => {
    dbExecute.mockResolvedValue(queryResult([chunkRow(), chunkRow({ ref: 'otro' })]));
    llmAnswers('Me mandé una cita que no existe [cita:7].');

    const res = await ask({ question: '¿Qué pasa con las citas inventadas?' });

    expect(res.citations).toEqual([]);
    expect(res.answer).toContain('[cita:7]');
  });

  it('deduplica la misma cita repetida', async () => {
    llmAnswers('Primero [cita:1], y de nuevo [cita:1].');

    const res = await ask({ question: '¿Cuántas citas quedan?' });

    expect(res.citations).toHaveLength(1);
  });

  it('trunca el texto de la cita a 200 caracteres', async () => {
    dbExecute.mockResolvedValue(queryResult([chunkRow({ text: 'x'.repeat(500) })]));
    llmAnswers('Largo [cita:1].');

    const res = await ask({ question: '¿Se trunca el texto de la cita?' });

    expect(res.citations[0]?.text).toHaveLength(201);
    expect(res.citations[0]?.text.endsWith('…')).toBe(true);
  });
});

// ─── Caminos que no llegan al LLM ─────────────────────────────────────────

describe('Oráculo — cuando no hay contexto', () => {
  it('sin chunks responde honesto y no llama al LLM', async () => {
    dbExecute.mockResolvedValue(queryResult([]));

    const res = await ask({ question: '¿Algo que no está en la KB?' });

    expect(res.answer).toContain('No tengo información suficiente');
    expect(res.citations).toEqual([]);
    expect(res.chunksUsed).toBe(0);
    expect(res.fallback).toBe('none');
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('con la DB caída no consulta ni llama al LLM', async () => {
    dbHealthy.mockResolvedValue(false);

    const res = await ask({ question: '¿Y si se cayó Postgres?' });

    expect(res.chunksUsed).toBe(0);
    expect(dbExecute).not.toHaveBeenCalled();
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('si falla la query de pgvector no hay segundo intento', async () => {
    // Antes existía un fallback a ILIKE sobre el texto del chunk. Se borró: sin
    // la extension instalada preferimos no responder a responder con contexto
    // traído por un match textual arbitrario.
    dbExecute.mockRejectedValue(new Error('type "vector" does not exist'));

    const res = await ask({ question: '¿Y si no está instalado pgvector?' });

    expect(dbExecute).toHaveBeenCalledTimes(1);
    expect(res.answer).toContain('No tengo información suficiente');
    expect(res.fallback).toBe('none');
    expect(createCompletion).not.toHaveBeenCalled();
  });
});

describe('Oráculo — origen del contexto', () => {
  it('reporta fallback pgvector cuando recuperó chunks', async () => {
    llmAnswers('Con contexto. [cita:1]');

    const res = await ask({ question: '¿De dónde salió el contexto?' });

    expect(res.fallback).toBe('pgvector');
    expect(res.provider).toBe('deterministic');
    expect(dbExecute).toHaveBeenCalledTimes(1);
  });
});

// ─── Errores del LLM ──────────────────────────────────────────────────────

describe('Oráculo — errores del LLM', () => {
  it('propaga el fallo del LLM para que la ruta devuelva 500', async () => {
    createCompletion.mockRejectedValue(
      new Error('401 Authentication Fails, Your api key: ****mock is invalid'),
    );

    await expect(ask({ question: '¿Qué pasa si la key es inválida?' })).rejects.toThrow(
      /LLM call failed/,
    );
  });

  it('una respuesta vacía del LLM falla en vez de devolver una respuesta en blanco', async () => {
    llmAnswers(null);

    // Este test afirmaba lo contrario: que `answer` quedara en ''. Eso era
    // codificar un fallo silencioso — el usuario recibía HTTP 200 con una
    // respuesta vacía y cero citas, indistinguible de "el oráculo no sabe".
    //
    // Pasa de verdad: con un modelo de razonamiento y el presupuesto viejo de
    // 600 tokens, el razonamiento se comía todo y `content` llegaba vacío con
    // finish_reason "length". Ahora se propaga y la ruta devuelve 500.
    await expect(ask({ question: '¿Y si el LLM no devuelve nada?' })).rejects.toThrow(
      /respuesta vacía/,
    );
  });
});
