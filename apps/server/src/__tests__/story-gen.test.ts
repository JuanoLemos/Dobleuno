/**
 * Tests del generador de crónicas (Ola 10).
 *
 * `openai` está mockeado, así que el pipeline corre entero sin red ni créditos.
 * La DB no hace falta: `generarCronica` recibe el BattleState ya cargado.
 *
 * Lo que se prueba de verdad es la validación: que una crónica no pueda
 * referenciar unidades ni hitos que no existieron.
 */
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

const { createCompletion } = vi.hoisted(() => ({ createCompletion: vi.fn() }));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: createCompletion } };
  },
}));

const { generarCronica, buildCronicaContext, validarCronica, extractAnclas, motivoSinContexto } =
  await import('../lib/story-gen.js');
const { resetLLMClient } = await import('../lib/llm-helper.js');
const { CRONICA_SYSTEM_PROMPT } = await import('../prompts/cronica.js');

import type { BattleState, BattleUnit, BattleLogEntry } from '@dobleuno/shared';

// ─── Fixtures ─────────────────────────────────────────────────────────────

function unidad(over: Partial<BattleUnit> = {}): BattleUnit {
  return {
    id: 'u-greatswords',
    ref: 'greatswords',
    name: 'Greatswords',
    faction: 'player',
    modelsCurrent: 10,
    modelsStart: 20,
    ranks: 2,
    status: 'engaged',
    woundsTaken: 10,
    activeEffects: [],
    ...over,
  };
}

function entrada(over: Partial<BattleLogEntry> = {}): BattleLogEntry {
  return {
    id: 'log-1',
    turn: 2,
    phase: 'combat',
    timestamp: '2026-09-14T01:00:00.000Z',
    text: 'Los Greatswords cargan contra la línea enemiga.',
    category: 'combat',
    ...over,
  };
}

function batalla(over: Partial<BattleState> = {}): BattleState {
  return {
    id: 'b-1',
    userId: 'user-1',
    name: 'Sábado en el club',
    scenario: 'Pitched Battle',
    playerListId: 'list-1',
    terrain: ['bosque', 'colina'],
    turn: 4,
    phase: 'end',
    activePlayer: 'player',
    units: [unidad(), unidad({ id: 'u-knights', name: 'Knights of the Realm', faction: 'opponent', status: 'destroyed', modelsCurrent: 0 })],
    log: [entrada({ id: 'log-2', turn: 3, text: 'Los Knights of the Realm son destruidos.' }), entrada()],
    status: 'finished',
    winner: 'player',
    startedAt: '2026-09-14T00:00:00.000Z',
    finishedAt: '2026-09-14T02:30:00.000Z',
    updatedAt: '2026-09-14T02:30:00.000Z',
    ...over,
  };
}

function llmResponde(texto: string): void {
  createCompletion.mockResolvedValue({ choices: [{ message: { content: texto } }] });
}

const prevKey = process.env.DEEPSEEK_API_KEY;

beforeEach(() => {
  // mockReset y no clearAllMocks: clear vacía las llamadas pero NO la cola de
  // mockResolvedValueOnce, así que un `once` que un test no llegó a consumir se
  // lo come el siguiente.
  createCompletion.mockReset();
  resetLLMClient();
  process.env.DEEPSEEK_API_KEY = 'sk-test-mock';
  llmResponde('Relato por defecto sin anclas.');
});

afterAll(() => {
  if (prevKey === undefined) delete process.env.DEEPSEEK_API_KEY;
  else process.env.DEEPSEEK_API_KEY = prevKey;
});

// ─── Contexto ─────────────────────────────────────────────────────────────

describe('buildCronicaContext', () => {
  it('numera unidades y hitos, y marca las destruidas', () => {
    const ctx = buildCronicaContext(batalla(), 'cronista');

    expect(ctx.unidades).toHaveLength(2);
    expect(ctx.unidades[0]?.nombre).toBe('Greatswords');
    expect(ctx.unidades[1]?.destruida).toBe(true);
    expect(ctx.hitos.length).toBeGreaterThan(0);
  });

  it('calcula la duración desde startedAt y finishedAt', () => {
    const ctx = buildCronicaContext(batalla(), 'cronista');
    expect(ctx.duracionMin).toBe(150);
  });

  it('deja la duración en null si la batalla no tiene finishedAt', () => {
    const ctx = buildCronicaContext(batalla({ finishedAt: undefined }), 'cronista');
    expect(ctx.duracionMin).toBeNull();
  });

  it('descarta las entradas de categoría system', () => {
    const ctx = buildCronicaContext(
      batalla({
        log: [
          entrada({ id: 'sys', category: 'system', text: 'Cambio a fase Magia' }),
          entrada({ id: 'comb', category: 'combat', text: 'Choque en el flanco' }),
        ],
      }),
      'cronista',
    );
    expect(ctx.hitos.map((h) => h.id)).toEqual(['comb']);
  });

  it('capa los hitos en 40 aunque el log sea enorme', () => {
    const log = Array.from({ length: 200 }, (_, i) =>
      entrada({ id: `log-${i}`, text: `Evento ${i}` }),
    );
    const ctx = buildCronicaContext(batalla({ log }), 'cronista');
    expect(ctx.hitos).toHaveLength(40);
  });

  it('capa la preferencia del autor en 500 caracteres', () => {
    const ctx = buildCronicaContext(batalla(), 'epico', 'x'.repeat(900));
    expect(ctx.promptUsuario).toHaveLength(500);
  });
});

// ─── Anclas ───────────────────────────────────────────────────────────────

describe('extractAnclas', () => {
  const ctx = buildCronicaContext(batalla(), 'cronista');

  it('mapea [u:N] y [h:N] a la unidad y el hito correctos', () => {
    const { anclas } = extractAnclas('Los Greatswords [u:1] aguantaron [h:1].', ctx);
    expect(anclas).toHaveLength(2);
    expect(anclas[0]).toMatchObject({ tipo: 'unidad', indice: 1, texto: 'Greatswords' });
    expect(anclas[1]?.tipo).toBe('hito');
  });

  it('borra del texto las anclas fuera de rango', () => {
    const { texto, anclas, descartadas } = extractAnclas('Algo pasó [u:99] por ahí.', ctx);
    expect(anclas).toEqual([]);
    expect(descartadas).toBe(1);
    expect(texto).not.toContain('[u:99]');
    expect(texto).toBe('Algo pasó por ahí.');
  });

  it('deduplica la misma ancla repetida', () => {
    const { anclas } = extractAnclas('Uno [u:1], y otra vez [u:1].', ctx);
    expect(anclas).toHaveLength(1);
  });

  it('conserva las válidas aunque haya inválidas en el mismo texto', () => {
    const { texto, anclas } = extractAnclas('Válida [u:1] e inválida [u:42].', ctx);
    expect(anclas).toHaveLength(1);
    expect(texto).toContain('[u:1]');
    expect(texto).not.toContain('[u:42]');
  });
});

// ─── Validación ───────────────────────────────────────────────────────────

describe('validarCronica', () => {
  const ctx = buildCronicaContext(batalla(), 'cronista');

  it('avisa si el relato no ancló nada', () => {
    const { warnings } = validarCronica('Un relato sin ninguna referencia.', ctx);
    expect(warnings.join(' ')).toContain('no ancló');
  });

  it('avisa si menciona nombres que no están en la partida', () => {
    const { warnings } = validarCronica(
      'Los Greatswords [u:1] cargaron junto a los Demigryph Knights.',
      ctx,
    );
    expect(warnings.join(' ')).toContain('Demigryph Knights');
  });

  it('no marca como inventados los nombres de unidades reales', () => {
    const { warnings } = validarCronica(
      'Los Greatswords [u:1] derrotaron a los Knights of the Realm [u:2].',
      ctx,
    );
    expect(warnings.join(' ')).not.toContain('Greatswords');
    expect(warnings.join(' ')).not.toContain('Knights of the Realm');
  });

  it('avisa si el cierre contradice el resultado', () => {
    const { warnings } = validarCronica(
      `Los Greatswords [u:1] pelearon. ${'Relleno. '.repeat(60)}Al final el ejército fue aniquilado y tuvo que retirarse.`,
      ctx,
    );
    expect(warnings.join(' ')).toContain('derrota');
  });

  it('recorta un relato desbocado', () => {
    const { texto } = validarCronica('x'.repeat(9000), ctx);
    expect(texto).toHaveLength(4000);
  });
});

// ─── Guarda sin contexto ──────────────────────────────────────────────────

describe('motivoSinContexto', () => {
  it('rechaza una batalla que no terminó', () => {
    expect(motivoSinContexto(batalla({ status: 'in-progress' }))).toBe('no-terminada');
  });

  it('rechaza una batalla terminada pero vacía', () => {
    expect(motivoSinContexto(batalla({ units: [], log: [] }))).toBe('sin-datos');
  });

  it('acepta una batalla terminada con datos', () => {
    expect(motivoSinContexto(batalla())).toBeNull();
  });
});

// ─── Pipeline completo ────────────────────────────────────────────────────

describe('generarCronica', () => {
  it('manda el system prompt de crónicas y el contexto numerado', async () => {
    llmResponde('Los Greatswords [u:1] hicieron lo suyo [h:1]. ' + 'Relleno. '.repeat(50));
    await generarCronica({ battle: batalla(), tono: 'cronista' });

    expect(createCompletion).toHaveBeenCalledTimes(1);
    const body = createCompletion.mock.calls[0]?.[0] as {
      messages: Array<{ role: string; content: string }>;
      temperature: number;
    };
    expect(body.messages[0]?.content).toBe(CRONICA_SYSTEM_PROMPT);
    expect(body.messages[1]?.content).toContain('[u:1] Greatswords');
    expect(body.messages[1]?.content).toContain('Resultado: Victoria del jugador');
    // Más alta que el oráculo: acá queremos prosa.
    expect(body.temperature).toBeGreaterThan(0.5);
  });

  it('devuelve las anclas validadas y el texto limpio', async () => {
    llmResponde(`Los Greatswords [u:1] resistieron [h:1], y un fantasma [u:77] no existió. ${'Relleno. '.repeat(50)}`);
    const res = await generarCronica({ battle: batalla(), tono: 'cronista' });

    expect(res.texto).not.toContain('[u:77]');
    expect(res.texto).toContain('[u:1]');
    expect(res.anclas.length).toBeGreaterThanOrEqual(1);
    expect(res.promptVersion).toBe('0.1');
  });

  it('el tono viaja en el prompt', async () => {
    llmResponde('Relato. ' + 'Relleno. '.repeat(60));
    await generarCronica({ battle: batalla(), tono: 'epico' });
    const body = createCompletion.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    expect(body.messages[1]?.content).toContain('Tono: épico');
  });

  it('reintenta una vez si el modelo inventó varios nombres', async () => {
    // Tres nombres compuestos inventados: el umbral del reintento es más de dos.
    const conAlucinaciones = `Aparecieron los Demigryph Knights, el Steam Tank y los Flagellant Warriors. ${'Relleno. '.repeat(50)}`;
    const limpio = `Los Greatswords [u:1] aguantaron el flanco [h:1]. ${'Relleno. '.repeat(50)}`;
    createCompletion
      .mockResolvedValueOnce({ choices: [{ message: { content: conAlucinaciones } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: limpio } }] });

    const res = await generarCronica({ battle: batalla(), tono: 'cronista' });

    expect(createCompletion).toHaveBeenCalledTimes(2);
    expect(res.texto).toContain('[u:1]');
    // El reintento le dice explícitamente qué nombres se inventó.
    const segundo = createCompletion.mock.calls[1]?.[0] as { messages: Array<{ content: string }> };
    expect(segundo.messages[1]?.content).toContain('Demigryph Knights');
  });

  it('sin API key usa el mock narrativo, no el del oráculo', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    resetLLMClient();

    const res = await generarCronica({ battle: batalla(), tono: 'cronista' });

    expect(createCompletion).not.toHaveBeenCalled();
    expect(res.modelo).toBe('mock');
    expect(res.texto).not.toContain('[cita:');
    expect(res.anclas.length).toBeGreaterThan(0);
  });

  it('propaga el fallo del LLM', async () => {
    createCompletion.mockRejectedValue(new Error('401 Authentication Fails'));
    await expect(generarCronica({ battle: batalla(), tono: 'cronista' })).rejects.toThrow(
      /LLM call failed/,
    );
  });
});
