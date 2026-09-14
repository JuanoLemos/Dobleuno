/**
 * Ola 10 — Generación del relato de una crónica.
 *
 * Flujo:
 *   1. Armar el contexto desde el BattleState (server-side, nunca el cliente).
 *   2. Mandarlo al LLM con el system prompt de crónicas.
 *   3. Validar la respuesta contra la partida real y limpiar lo que no cierre.
 *
 * El paso 3 es el que importa: el modelo emite anclas `[u:N]` / `[h:N]` y acá
 * se comprueban contra las unidades y hitos que de verdad existieron. Las
 * inválidas se descartan y se borran del texto. Es el mismo principio que
 * `extractCitations()` en rag.ts — nunca confiamos en que el modelo referenció
 * algo que existe.
 */
import { callLLM } from './llm-helper.js';
import { CRONICA_SYSTEM_PROMPT, CRONICA_PROMPT_VERSION, buildCronicaPrompt } from '../prompts/cronica.js';
import { getModel } from '../prompts/llm-client.js';
import { log } from './logger.js';
import type { CronicaPromptContext } from '../prompts/cronica.js';
import type { Ancla, TonoCronica, BattleState, BattleLogEntry } from '@dobleuno/shared';

/** Cuántos hitos del log entran en el prompt. */
const MAX_HITOS = 40;

/** Categorías del log que cuentan como hito narrativo. */
const CATEGORIAS_NARRATIVAS = new Set<BattleLogEntry['category']>([
  'combat',
  'magic',
  'psychology',
]);

/** Largo aceptable del relato. Fuera de esto es respuesta vacía o desbocada. */
const MIN_CHARS = 400;
const MAX_CHARS = 4000;

const FASE_LABELS: Record<string, string> = {
  start: 'inicio',
  movement: 'movimiento',
  magic: 'magia',
  shooting: 'disparo',
  combat: 'combate',
  end: 'cierre',
};

export interface GenerarCronicaInput {
  battle: BattleState;
  tono: TonoCronica;
  promptUsuario?: string | null;
}

export interface CronicaGenerada {
  texto: string;
  anclas: Ancla[];
  warnings: string[];
  modelo: string;
  promptVersion: string;
}

/** Motivo por el que una batalla no da para generar nada. */
export type MotivoSinContexto = 'no-terminada' | 'sin-datos';

/**
 * ¿Esta batalla tiene material para un relato?
 *
 * Si no lo tiene, la ruta corta acá y devuelve 422 sin gastar tokens — el mismo
 * criterio que usa el oráculo cuando el retrieval vuelve vacío.
 */
export function motivoSinContexto(battle: BattleState): MotivoSinContexto | null {
  if (battle.status !== 'finished') return 'no-terminada';
  if (battle.units.length === 0 && battle.log.length === 0) return 'sin-datos';
  return null;
}

/**
 * Arma el contexto que ve el LLM. Función pura: mismo BattleState, mismo
 * resultado, sin tocar red ni DB.
 */
export function buildCronicaContext(
  battle: BattleState,
  tono: TonoCronica,
  promptUsuario?: string | null,
): CronicaPromptContext {
  const unidades = battle.units.map((u) => ({
    id: u.id,
    nombre: u.name,
    faccion: u.faction,
    modelosInicio: u.modelsStart,
    modelosFinal: u.modelsCurrent,
    estado: u.status,
    destruida: u.status === 'destroyed' || u.modelsCurrent === 0,
  }));

  // Turnos donde murió algo: sus entradas son material narrativo aunque la
  // categoría no sea de combate.
  const turnosConBajas = new Set(
    battle.log
      .filter((e) => /destruid|aniquilad|huye|rompe/i.test(e.text))
      .map((e) => e.turn),
  );

  const hitos = battle.log
    .filter(
      (e) =>
        CATEGORIAS_NARRATIVAS.has(e.category) ||
        (e.category !== 'system' && turnosConBajas.has(e.turn)),
    )
    // El log viene con lo más nuevo primero; la crónica se lee en orden.
    .slice()
    .reverse()
    .slice(0, MAX_HITOS)
    .map((e) => ({
      id: e.id,
      turno: e.turn,
      fase: FASE_LABELS[e.phase] ?? e.phase,
      texto: e.text,
    }));

  const duracionMin =
    battle.finishedAt && battle.startedAt
      ? Math.max(
          0,
          Math.round(
            (new Date(battle.finishedAt).getTime() - new Date(battle.startedAt).getTime()) / 60000,
          ),
        )
      : null;

  return {
    nombre: battle.name,
    escenario: battle.scenario,
    terreno: battle.terrain,
    turnos: battle.turn + 1,
    duracionMin,
    resultado: battle.winner ?? null,
    unidades,
    hitos,
    promptUsuario: promptUsuario?.slice(0, 500) ?? null,
    tono,
  };
}

const ANCLA_RE = /\[(u|h):(\d+)\]/g;

/**
 * Extrae las anclas válidas y limpia del texto las que no lo son.
 *
 * A diferencia de `extractCitations()` en RAG, acá sí borramos los marcadores
 * inválidos: una cita rota en una respuesta del oráculo es ruido tolerable, un
 * `[u:9]` colgado en medio de un relato que alguien va a compartir, no.
 */
export function extractAnclas(
  texto: string,
  ctx: CronicaPromptContext,
): { texto: string; anclas: Ancla[]; descartadas: number } {
  const anclas: Ancla[] = [];
  const vistas = new Set<string>();
  let descartadas = 0;

  const limpio = texto.replace(ANCLA_RE, (match, tipo: string, nStr: string) => {
    const n = Number.parseInt(nStr, 10);
    const esUnidad = tipo === 'u';
    const fuente = esUnidad ? ctx.unidades[n - 1] : ctx.hitos[n - 1];

    if (Number.isNaN(n) || n < 1 || !fuente) {
      descartadas++;
      return ''; // el marcador inventado se va del texto
    }

    const clave = `${tipo}:${n}`;
    if (!vistas.has(clave)) {
      vistas.add(clave);
      anclas.push({
        tipo: esUnidad ? 'unidad' : 'hito',
        indice: n,
        ref: fuente.id,
        texto: esUnidad
          ? (fuente as CronicaPromptContext['unidades'][number]).nombre
          : (fuente as CronicaPromptContext['hitos'][number]).texto,
      });
    }
    return match;
  });

  // Limpiar los espacios dobles que puede dejar un marcador borrado.
  return { texto: limpio.replace(/ {2,}/g, ' ').replace(/ +([.,;])/g, '$1'), anclas, descartadas };
}

/**
 * Busca nombres de unidad inventados.
 *
 * Heurística deliberadamente conservadora: solo mira secuencias de palabras
 * capitalizadas de dos o más tokens, que es como se ven los nombres de unidad
 * de TOW ("Empire Greatswords", "Knights of the Realm"). Evita marcar cada
 * inicio de oración.
 */
export function nombresInventados(texto: string, ctx: CronicaPromptContext): string[] {
  const conocidos = new Set(ctx.unidades.map((u) => u.nombre.toLowerCase()));
  const candidatos = texto.match(/\b([A-Z][a-zá-ú]+(?: [A-Z][a-zá-ú]+)+)\b/g) ?? [];
  const inventados = new Set<string>();

  for (const c of candidatos) {
    const lower = c.toLowerCase();
    if (conocidos.has(lower)) continue;
    // ¿Es parte del nombre de alguna unidad conocida, o al revés?
    const relacionado = [...conocidos].some((k) => k.includes(lower) || lower.includes(k));
    if (!relacionado) inventados.add(c);
  }
  return [...inventados];
}

/** Valida el relato contra la partida. No tira: devuelve texto limpio + warnings. */
export function validarCronica(
  texto: string,
  ctx: CronicaPromptContext,
): { texto: string; anclas: Ancla[]; warnings: string[] } {
  const warnings: string[] = [];
  const { texto: limpio, anclas, descartadas } = extractAnclas(texto.trim(), ctx);

  if (descartadas > 0) {
    warnings.push(`Se descartaron ${descartadas} referencias que no coincidían con la partida.`);
  }
  if (anclas.length === 0) {
    warnings.push('El relato no ancló ninguna afirmación a la partida.');
  }

  const inventados = nombresInventados(limpio, ctx);
  if (inventados.length > 0) {
    warnings.push(`Nombres que no aparecen en la partida: ${inventados.join(', ')}.`);
  }

  if (limpio.length < MIN_CHARS) {
    warnings.push('El relato quedó más corto de lo esperado.');
  }
  if (limpio.length > MAX_CHARS) {
    warnings.push('El relato quedó más largo de lo esperado y se recortó.');
  }

  // Coherencia del desenlace: heurística barata sobre el cierre.
  if (ctx.resultado === 'player' || ctx.resultado === 'opponent') {
    const cierre = limpio.slice(-400).toLowerCase();
    const dice = {
      derrota: /derrot|caíd|aniquilad|no pudo|retirad/.test(cierre),
      victoria: /victoria|triunf|venci|impuso|ganó/.test(cierre),
    };
    if (ctx.resultado === 'player' && dice.derrota && !dice.victoria) {
      warnings.push('El cierre suena a derrota pero la partida la ganó el jugador.');
    }
    if (ctx.resultado === 'opponent' && dice.victoria && !dice.derrota) {
      warnings.push('El cierre suena a victoria pero la partida la perdió el jugador.');
    }
  }

  return { texto: limpio.slice(0, MAX_CHARS), anclas, warnings };
}

/**
 * Genera el relato. Reintenta una vez si el modelo alucinó nombres, pasándole
 * los warnings; si vuelve a fallar, devuelve el mejor intento con los avisos
 * puestos — el autor ya esperó y los tokens ya se gastaron.
 */
export async function generarCronica(input: GenerarCronicaInput): Promise<CronicaGenerada> {
  const ctx = buildCronicaContext(input.battle, input.tono, input.promptUsuario);
  const modelo = process.env.DEEPSEEK_API_KEY ? getModel() : 'mock';

  const crudo = await callLLM({
    system: CRONICA_SYSTEM_PROMPT,
    user: buildCronicaPrompt(ctx),
    temperature: 0.8, // más alta que el oráculo: acá queremos prosa, no precisión literal
    maxTokens: 1200,
    mockKind: 'cronica',
  });

  let resultado = validarCronica(crudo, ctx);

  const alucinaciones = nombresInventados(resultado.texto, ctx);
  if (alucinaciones.length > 2) {
    log.warn('Cronica con alucinaciones, reintentando', {
      battleId: input.battle.id,
      nombres: alucinaciones.slice(0, 5),
    });
    const reintento = await callLLM({
      system: CRONICA_SYSTEM_PROMPT,
      user: `${buildCronicaPrompt(ctx)}

---

IMPORTANTE: en un intento anterior mencionaste nombres que NO están en esta partida: ${alucinaciones.join(', ')}. Usá únicamente los nombres de unidad que aparecen en el bloque "Unidades".`,
      temperature: 0.6,
      maxTokens: 1200,
      mockKind: 'cronica',
    });
    const segundo = validarCronica(reintento, ctx);
    // Nos quedamos con el que tenga menos warnings.
    if (segundo.warnings.length <= resultado.warnings.length) resultado = segundo;
  }

  return {
    texto: resultado.texto,
    anclas: resultado.anclas,
    warnings: resultado.warnings,
    modelo,
    promptVersion: CRONICA_PROMPT_VERSION,
  };
}
