/**
 * Dobleuno — Tests del System Prompt v0.1
 *
 * Dos tipos de tests:
 *   1. Estáticos: verifican la estructura del prompt. Corren siempre.
 *   2. Live: llaman a DeepSeek con cada pregunta del fixture y validan la respuesta.
 *      Se saltean si DEEPSEEK_API_KEY no está configurada.
 *
 * Para correr todo:
 *   cp .env.example .env  # completar con tu API key de DeepSeek
 *   npm test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type OpenAI from 'openai';

import {
  DOBLEUNO_SYSTEM_PROMPT,
  PROMPT_VERSION,
  PROMPT_LAST_UPDATED,
  buildPrompt,
  CITATION_REGEX,
  CITATION_LINE_REGEX,
} from '../system.js';
import {
  DEEPSEEK_DEFAULT_MODEL,
  createDeepSeekClient,
  getDeepSeekConfig,
} from '../llm-client.js';
import type { AskResponse, Citation } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FixtureQuestion {
  id: string;
  category: string;
  expectedType: 'answerable' | 'rejection' | 'not-in-kb';
  question: string;
  expectedKeyTerms: string[];
  expectedCitationSources: string[];
  expectedConfidence: string;
}

interface Fixture {
  version: string;
  questions: FixtureQuestion[];
}

interface ExpectedCriteria {
  mustMention: string[];
  mustNotMention: string[];
  expectedFormat: string;
  expectedNumeric?: string[];
  expectedRejection?: boolean;
}

interface ExpectedAnswers {
  version: string;
  criteria: Record<string, ExpectedCriteria>;
}

const hasApiKey = !!process.env.DEEPSEEK_API_KEY;
const describeIfApi = hasApiKey ? describe : describe.skip;
const model = process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL;

// ─── STATIC TESTS ─────────────────────────────────────────────────────────

describe('System prompt — estructura estática', () => {
  it('tiene una versión declarada', () => {
    expect(PROMPT_VERSION).toBe('0.1');
  });

  it('tiene una fecha de última actualización', () => {
    expect(PROMPT_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('no está vacío', () => {
    expect(DOBLEUNO_SYSTEM_PROMPT.length).toBeGreaterThan(1000);
  });

  it.each([
    ['## Identidad'],
    ['## Lo que SABÉS'],
    ['## Lo que NO SABÉS'],
    ['## Capacidades'],
    ['## Restricciones (NO)'],
    ['## Tono'],
    ['## Formato de respuesta (REGLAS DURAS)'],
    ['## Edge cases'],
    ['## Contexto que podés recibir'],
    ['## Ejemplos (few-shot)'],
  ])('contiene la sección requerida: %s', (section) => {
    expect(DOBLEUNO_SYSTEM_PROMPT).toContain(section);
  });

  it('declara la restricción de no inventar reglas con la frase exacta', () => {
    expect(DOBLEUNO_SYSTEM_PROMPT).toMatch(/NO inventar reglas/i);
    expect(DOBLEUNO_SYSTEM_PROMPT).toContain('No tengo esa regla registrada en mi base');
  });

  it('declara la restricción de no conocer otros sistemas', () => {
    expect(DOBLEUNO_SYSTEM_PROMPT).toMatch(/NO conocer otros sistemas/i);
  });

  it('declara el formato de cita con "Fuente:"', () => {
    expect(DOBLEUNO_SYSTEM_PROMPT).toContain('*Fuente:');
  });

  it('incluye al menos 3 ejemplos few-shot', () => {
    const exampleMatches = DOBLEUNO_SYSTEM_PROMPT.match(/\*\*Ejemplo \d+\*\*/g);
    expect(exampleMatches?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('incluye los 5 ejemplos planeados', () => {
    const exampleMatches = DOBLEUNO_SYSTEM_PROMPT.match(/\*\*Ejemplo \d+\*\*[^*]+/g);
    const labels = exampleMatches?.map((m) => m.match(/\d+/)?.[0]).filter(Boolean) ?? [];
    expect(labels).toEqual(['1', '2', '3', '4', '5']);
  });

  it('menciona las 6 fases de TOW', () => {
    expect(DOBLEUNO_SYSTEM_PROMPT).toContain('Start');
    expect(DOBLEUNO_SYSTEM_PROMPT).toContain('Movement');
    expect(DOBLEUNO_SYSTEM_PROMPT).toContain('Magic');
    expect(DOBLEUNO_SYSTEM_PROMPT).toContain('Shooting');
    expect(DOBLEUNO_SYSTEM_PROMPT).toContain('Combat');
    expect(DOBLEUNO_SYSTEM_PROMPT).toContain('End');
  });

  it('declara la versión del prompt en el cuerpo', () => {
    expect(DOBLEUNO_SYSTEM_PROMPT).toContain('v0.1');
  });

  it('el prompt no menciona el LLM provider (debe ser provider-agnostic)', () => {
    expect(DOBLEUNO_SYSTEM_PROMPT.toLowerCase()).not.toContain('anthropic');
    expect(DOBLEUNO_SYSTEM_PROMPT.toLowerCase()).not.toContain('openai');
    expect(DOBLEUNO_SYSTEM_PROMPT.toLowerCase()).not.toContain('deepseek');
  });
});

describe('buildPrompt() — construcción con contexto', () => {
  it('devuelve el prompt base cuando no hay contexto', () => {
    const result = buildPrompt({});
    expect(result).toBe(DOBLEUNO_SYSTEM_PROMPT);
  });

  it('agrega el bloque de contexto cuando hay datos', () => {
    const result = buildPrompt({
      playerName: 'Juano',
      turnNumber: 3,
      phase: 'combat',
    });
    expect(result).toContain('# Contexto actual de la partida');
    expect(result).toContain('**Jugador**: Juano');
    expect(result).toContain('**Turno**: 3');
    expect(result).toContain('**Fase**: combat');
  });

  it('serializa el estado del juego como JSON', () => {
    const result = buildPrompt({
      gameState: {
        phase: 'movement',
        turn: 1,
        activePlayer: 'player',
        units: [],
      },
    });
    expect(result).toContain('"phase": "movement"');
  });

  it('omite el bloque de contexto si todos los campos están vacíos', () => {
    const result = buildPrompt({
      playerName: '',
      phase: undefined,
      turnNumber: undefined,
    });
    expect(result).not.toContain('# Contexto actual de la partida');
  });
});

describe('CITATION_REGEX — formato de citas', () => {
  it.each([
    ['*Fuente: Reglamento TOW · Movement*', true],
    ['Fuente: tow.whfb.app / Movement', true],
    ['*Fuente: FAQ oficial GW 2025-04*', true],
    ['sin cita', false],
  ])('matchea correctamente: %s', (input, shouldMatch) => {
    const regex = /\*?Fuente:\s*([^*\n]+)\*?/i;
    if (shouldMatch) {
      expect(input).toMatch(regex);
    } else {
      expect(input).not.toMatch(regex);
    }
  });

  it('CITATION_LINE_REGEX matchea el formato recomendado con asteriscos', () => {
    const good = '*Fuente: Reglamento TOW · Movement*';
    const bad = 'Fuente: Reglamento TOW · Movement';
    expect(good).toMatch(CITATION_LINE_REGEX);
    expect(bad).not.toMatch(CITATION_LINE_REGEX);
  });

  it('CITATION_REGEX tiene flag global (g) — requerido para matchAll', () => {
    expect(CITATION_REGEX.global).toBe(true);
  });

  it('CITATION_REGEX funciona con String.prototype.matchAll', () => {
    const text =
      'Veredicto: sí. *Fuente: Reglamento TOW · Movement* Y *Fuente: tow.whfb.app / Cover*';
    const matches = [...text.matchAll(CITATION_REGEX)];
    expect(matches).toHaveLength(2);
    expect(matches[0]?.[1]?.trim()).toBe('Reglamento TOW · Movement');
    expect(matches[1]?.[1]?.trim()).toBe('tow.whfb.app / Cover');
  });
});

// ─── LIVE TESTS (DeepSeek API) ────────────────────────────────────────────

const fixturePath = join(__dirname, '..', 'fixtures', 'questions.json');
const criteriaPath = join(__dirname, '..', 'fixtures', 'expected-answers.json');
const fixture: Fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as Fixture;
const criteria: ExpectedAnswers = JSON.parse(readFileSync(criteriaPath, 'utf-8')) as ExpectedAnswers;

let client: OpenAI | undefined;

beforeAll(() => {
  if (hasApiKey) {
    // Validamos config antes de instanciar
    getDeepSeekConfig();
    client = createDeepSeekClient();
  }
});

/** Llama a DeepSeek con el prompt de Dobleuno + la pregunta, mide latencia. */
async function askDobleuno(
  question: string,
  context: Record<string, unknown> = {},
): Promise<AskResponse> {
  if (!client) {
    throw new Error('DeepSeek client no inicializado (DEEPSEEK_API_KEY faltante)');
  }
  const t0 = performance.now();
  const systemPrompt = buildPrompt(context);
  const response = await client.chat.completions.create({
    model,
    max_tokens: 1500,
    temperature: 0.3,
    top_p: 0.9,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
  });
  const t1 = performance.now();

  const choice = response.choices[0];
  if (!choice) throw new Error('DeepSeek no devolvió choices');
  const text = choice.message.content ?? '';

  const citations = extractCitations(text);
  const confidence = inferConfidence(text, citations);

  return {
    answer: text,
    citations,
    confidence,
    latencyMs: Math.round(t1 - t0),
    model,
    promptVersion: PROMPT_VERSION,
  };
}

function extractCitations(text: string): Citation[] {
  const matches = [...text.matchAll(CITATION_REGEX)];
  return matches.map((m) => {
    const raw = (m[1] ?? '').trim();
    return {
      raw,
      source: inferCitationSource(raw),
      matched: raw.length > 0,
    };
  });
}

function inferCitationSource(raw: string): Citation['source'] {
  const lower = raw.toLowerCase();
  if (lower.includes('tow.whfb')) return 'tow_whfb';
  if (lower.includes('faq')) return 'faq';
  if (lower.includes('errata')) return 'errata';
  if (lower.includes('reglamento') || lower.includes('regulation')) return 'regulation';
  return 'unknown';
}

function inferConfidence(text: string, citations: Citation[]): AskResponse['confidence'] {
  const lower = text.toLowerCase();
  if (lower.includes('no tengo esa regla') || lower.includes('solo ayudo con')) return 'rejected';
  if (lower.includes('no estoy seguro') || lower.includes('no tengo info')) return 'low';
  if (citations.length === 0) return 'low';
  if (citations.length >= 1 && !lower.includes('creo que')) return 'high';
  return 'medium';
}

describeIfApi('Live — DeepSeek API', () => {
  it(`DEEPSEEK_API_KEY configurada · modelo ${model}`, () => {
    expect(hasApiKey).toBe(true);
  });

  it.each(fixture.questions)(
    '$id · $expectedType',
    async (q: FixtureQuestion) => {
      const res = await askDobleuno(q.question);
      const c = criteria.criteria[q.id];
      if (!c) throw new Error(`Sin criterios para ${q.id}`);

      // 1. Si es expectedType=rejection, el AI debe rechazar amablemente
      if (q.expectedType === 'rejection') {
        expect(res.confidence).toBe('rejected');
        for (const term of c.mustMention) {
          expect(res.answer.toLowerCase()).toContain(term.toLowerCase());
        }
        return;
      }

      // 2. Para todas las demás, debe tener al menos 1 cita
      expect(res.citations.length, `${q.id} sin citas`).toBeGreaterThanOrEqual(1);
      expect(res.answer, `${q.id} respuesta vacía`).toBeTruthy();
      expect(res.answer.length, `${q.id} respuesta demasiado corta`).toBeGreaterThan(40);

      // 3. Términos que DEBE mencionar
      for (const term of c.mustMention) {
        expect(
          res.answer.toLowerCase(),
          `${q.id} no menciona "${term}"`,
        ).toContain(term.toLowerCase());
      }

      // 4. Términos que NO debe mencionar (anti-alucinación)
      for (const term of c.mustNotMention) {
        expect(
          res.answer.toLowerCase(),
          `${q.id} menciona incorrectamente "${term}"`,
        ).not.toContain(term.toLowerCase());
      }

      // 5. Latencia aceptable
      expect(res.latencyMs, `${q.id} muy lento`).toBeLessThan(8000);

      // 6. Log para auditoría
      console.log(
        `[${q.id}] ${res.latencyMs}ms · ${res.citations.length} cita(s) · confidence=${res.confidence}`,
      );
    },
    30_000,
  );
});

// ─── SMOKE TEST (sin API, smoke del setup) ────────────────────────────────

describe('Smoke — imports y configuración', () => {
  it('CITATION_REGEX está exportado y es función regex', () => {
    expect(CITATION_REGEX).toBeInstanceOf(RegExp);
  });

  it('CITATION_LINE_REGEX está exportado y es función regex', () => {
    expect(CITATION_LINE_REGEX).toBeInstanceOf(RegExp);
  });

  it('la fixture tiene 10 preguntas', () => {
    expect(fixture.questions.length).toBe(10);
  });

  it('cada pregunta tiene criterios definidos', () => {
    for (const q of fixture.questions) {
      expect(criteria.criteria[q.id], `Sin criterios para ${q.id}`).toBeDefined();
    }
  });

  it('getDeepSeekConfig lanza error claro si falta la API key', () => {
    const prev = process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    expect(() => getDeepSeekConfig()).toThrow(/DEEPSEEK_API_KEY/);
    process.env.DEEPSEEK_API_KEY = prev;
  });
});
