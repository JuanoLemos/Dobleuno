/**
 * Tests del traductor: lo que pasa cuando el lote no entra en el presupuesto.
 *
 * ── Por qué justo esto ───────────────────────────────────────────────────
 *
 * La corrida del 2026-09-14 tradujo 2163 entradas en 104 minutos y terminó en
 * exit 1: 40 lotes se truncaron por `max_tokens`, cada uno reintentado tres
 * veces con el mismo payload —o sea 120 requests pagadas para fallar igual— y
 * el corpus quedó con 384 reglas en inglés adentro del archivo "traducido".
 * El validador lo atajó y no promovió nada, que es el único motivo por el que
 * la falla no llegó a la base.
 *
 * El arreglo es partir el lote al medio. Estos tests lo fijan sin gastar API:
 * `fetch` está mockeado para truncar cualquier request con más de una entrada,
 * que es el caso peor imaginable.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface Traducible {
  id: string;
  name: string;
  text: string;
  [k: string]: unknown;
}

/** Cuántas entradas venían en cada request que se le hizo al "LLM". */
let tamaniosPedidos: number[] = [];

/**
 * Un DeepSeek de mentira que se queda sin tokens con más de `maximo` entradas.
 */
function mockearFetch(maximo: number): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { messages: Array<{ content: string }> };
      const prompt = body.messages[1]?.content ?? '';
      const entradas = (JSON.parse(
        /Entradas:\n([\s\S]*)$/.exec(prompt)?.[1] ?? '[]',
      ) as Traducible[]);
      tamaniosPedidos.push(entradas.length);

      if (entradas.length > maximo) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: '{"entrad' }, finish_reason: 'length' }],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    entradas: entradas.map((e) => ({
                      id: e.id,
                      nameEs: `${e.name} ES`,
                      textEs: `${e.text} ES`,
                    })),
                  }),
                },
                finish_reason: 'stop',
              },
            ],
          }),
      });
    }),
  );
}

function lote(n: number): Traducible[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `rule-${i}`,
    name: `Regla ${i}`,
    text: `Texto ${i}`,
  }));
}

describe('traducirLote · presupuesto de tokens', () => {
  beforeEach(() => {
    tamaniosPedidos = [];
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('parte el lote cuando se trunca, y traduce todo igual', async () => {
    mockearFetch(2);
    const { traducirLote } = await import('../translate-tow.js');
    const cache: Record<string, { nameEs: string; textEs: string }> = {};

    const r = await traducirLote('rule', lote(8), cache, false);

    // Ninguna entrada se pierde: es la diferencia con abandonar el lote.
    expect(r.size).toBe(8);
    expect(r.get('rule-0')?.textEs).toBe('Texto 0 ES');
    expect(r.get('rule-7')?.textEs).toBe('Texto 7 ES');
    // Y bajó sólo hasta donde hacía falta: 8 → 4 → 2, no hasta 1.
    expect(Math.max(...tamaniosPedidos.filter((n) => n <= 2))).toBe(2);
  });

  it('baja hasta una entrada por request si hace falta', async () => {
    mockearFetch(1);
    const { traducirLote } = await import('../translate-tow.js');
    const r = await traducirLote('rule', lote(4), {}, false);
    expect(r.size).toBe(4);
    expect(tamaniosPedidos).toContain(1);
  });

  it('no reintenta un truncado con el mismo payload', async () => {
    // Reintentar es determinísticamente inútil y se paga igual: 40 lotes
    // fallidos se cobraron tres veces cada uno.
    mockearFetch(0);
    const { traducirLote, ErrorDeTruncado } = await import('../translate-tow.js');
    await expect(traducirLote('rule', lote(1), {}, false)).rejects.toBeInstanceOf(ErrorDeTruncado);
    expect(tamaniosPedidos).toEqual([1]);
  });

  it('una entrada imposible no se lleva puestas a sus hermanas', async () => {
    // El fallo real: la excepción subía por la recursión y abortaba las
    // mitades que todavía no se habían procesado. 8 lotes así dejaron 21
    // reglas en inglés, y 14 de ellas eran perfectamente traducibles.
    mockearFetch(1);
    const { traducirLote, ErrorDeTruncado } = await import('../translate-tow.js');
    // La primera entrada no entra ni sola; las otras tres sí.
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body) as { messages: Array<{ content: string }> };
        const entradas = JSON.parse(
          /Entradas:\n([\s\S]*)$/.exec(body.messages[1]?.content ?? '')?.[1] ?? '[]',
        ) as Traducible[];
        const imposible = entradas.some((e) => e.id === 'rule-0');
        if (entradas.length > 1 || imposible) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                choices: [{ message: { content: '{' }, finish_reason: 'length' }],
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      entradas: entradas.map((e) => ({
                        id: e.id,
                        nameEs: e.name,
                        textEs: `${e.text} ES`,
                      })),
                    }),
                  },
                  finish_reason: 'stop',
                },
              ],
            }),
        });
      }),
    );

    const cache: Record<string, { nameEs: string; textEs: string }> = {};
    const err = await traducirLote('rule', lote(4), cache, false).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ErrorDeTruncado);
    const truncado = err as InstanceType<typeof ErrorDeTruncado>;
    // Nombra sólo a la que de verdad no entró, no al lote entero: si acusa a
    // entradas que están traducidas, el log miente.
    expect(truncado.ids).toEqual(['rule-0']);
    // Y las otras tres salieron, quedaron en el cache y viajan en el error
    // para que la corrida las escriba en vez de dejarlas en inglés.
    expect([...truncado.parciales.keys()].sort()).toEqual(['rule-1', 'rule-2', 'rule-3']);
    expect(Object.keys(cache)).toHaveLength(3);
  });

  it('cachea lo que sí salió de un lote que hubo que partir', async () => {
    // Si el corte se pierde, el re-run vuelve a pagar por lo ya traducido.
    mockearFetch(2);
    const { traducirLote } = await import('../translate-tow.js');
    const cache: Record<string, { nameEs: string; textEs: string }> = {};
    await traducirLote('rule', lote(8), cache, false);
    expect(Object.keys(cache)).toHaveLength(8);

    tamaniosPedidos = [];
    const segunda = await traducirLote('rule', lote(8), cache, false);
    expect(segunda.size).toBe(8);
    expect(tamaniosPedidos).toEqual([]);
  });
});
